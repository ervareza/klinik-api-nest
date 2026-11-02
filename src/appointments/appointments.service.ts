import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { paginate, Paginated } from '../common/pagination';
import { badRequest, conflict, notFound } from '../common/problem.exception';
import { Appointment, AppointmentStatus } from './appointment.entity';
import { AppointmentsRepository } from './appointments.repository';
import { CreateAppointmentDto, ListAppointmentsQueryDto } from './dto/appointment.dto';

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const today = (): string => new Date().toISOString().slice(0, 10);

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly appointments: AppointmentsRepository,
    private readonly dataSource: DataSource,
  ) {}

  async list(query: ListAppointmentsQueryDto): Promise<Paginated<Appointment>> {
    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw badRequest('INVALID_DATE_RANGE', 'dateFrom tidak boleh setelah dateTo.');
    }
    const [rows, total] = await this.appointments.findPage(query);
    return paginate(rows, total, query.page, query.limit);
  }

  async get(id: number): Promise<Appointment> {
    const appointment = await this.appointments.findById(id);
    if (!appointment) throw notFound('APPOINTMENT_NOT_FOUND', `Janji temu dengan id ${id} tidak ditemukan.`);
    return appointment;
  }

  /**
   * Pemesanan janji temu dalam satu transaksi:
   * insert lalu cek kuota. Bila kuota terlampaui, exception membatalkan insert (ROLLBACK);
   * bila semua lolos, transaksi di-COMMIT otomatis.
   */
  async book(dto: CreateAppointmentDto): Promise<Appointment> {
    if (dto.appointmentDate < today()) {
      throw badRequest('APPOINTMENT_DATE_IN_PAST', 'Tanggal janji temu tidak boleh di masa lalu.');
    }
    const { doctorId, patientId, appointmentDate, complaint } = dto;

    const created = await this.dataSource.transaction(async (manager) => {
      const doctor = await this.appointments.lockDoctor(manager, doctorId);
      if (!doctor) throw notFound('DOCTOR_NOT_FOUND', `Dokter dengan id ${doctorId} tidak ditemukan.`);
      if (!doctor.isActive) throw conflict('DOCTOR_INACTIVE', 'Dokter sedang tidak aktif praktik.');

      const patient = await this.appointments.findPatient(manager, patientId);
      if (!patient) throw notFound('PATIENT_NOT_FOUND', `Pasien dengan id ${patientId} tidak ditemukan.`);

      const queueNumber = await this.appointments.nextQueueNumber(manager, doctorId, appointmentDate);
      const appointment = await this.appointments.insertInTransaction(manager, {
        patientId,
        doctorId,
        appointmentDate,
        queueNumber,
        complaint,
        status: 'SCHEDULED',
      });

      const active = await this.appointments.countActive(manager, doctorId, appointmentDate);
      if (active > doctor.dailyQuota) {
        this.logger.warn(`ROLLBACK: kuota dokter ${doctorId} pada ${appointmentDate} penuh (${doctor.dailyQuota})`);
        throw conflict('QUOTA_FULL', `Kuota dokter pada ${appointmentDate} sudah penuh (${doctor.dailyQuota} pasien).`);
      }
      return appointment;
    });

    this.logger.log(`COMMIT: janji temu ${created.id} antrean ${created.queueNumber}`);
    return created;
  }

  async updateStatus(id: number, status: AppointmentStatus): Promise<Appointment> {
    const current = await this.get(id);
    if (!TRANSITIONS[current.status].includes(status)) {
      throw conflict('INVALID_STATUS_TRANSITION', `Status ${current.status} tidak dapat diubah menjadi ${status}.`);
    }
    const changed = await this.appointments.transitionStatus(id, current.status, status);
    if (!changed) throw conflict('INVALID_STATUS_TRANSITION', 'Status janji temu baru saja berubah. Muat ulang data.');
    return this.get(id);
  }

  async remove(id: number): Promise<void> {
    const current = await this.get(id);
    if (current.status === 'CHECKED_IN' || current.status === 'COMPLETED') {
      throw conflict('APPOINTMENT_IN_PROGRESS', 'Janji temu yang sudah berjalan atau selesai tidak dapat dihapus.');
    }
    await this.appointments.deleteById(id);
  }
}
