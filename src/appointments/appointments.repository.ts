import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Doctor } from '../doctors/doctor.entity';
import { Patient } from '../patients/patient.entity';
import { Appointment, AppointmentStatus } from './appointment.entity';
import { ListAppointmentsQueryDto } from './dto/appointment.dto';

@Injectable()
export class AppointmentsRepository {
  constructor(@InjectRepository(Appointment) private readonly repo: Repository<Appointment>) {}

  async findPage(query: ListAppointmentsQueryDto): Promise<[Appointment[], number]> {
    const { page, limit, patientId, doctorId, status, dateFrom, dateTo, sortBy, sortOrder } = query;
    const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';
    const qb = this.repo.createQueryBuilder('a');
    if (patientId) qb.andWhere('a.patientId = :patientId', { patientId });
    if (doctorId) qb.andWhere('a.doctorId = :doctorId', { doctorId });
    if (status) qb.andWhere('a.status = :status', { status });
    if (dateFrom) qb.andWhere('a.appointmentDate >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('a.appointmentDate <= :dateTo', { dateTo });
    return qb
      .orderBy(`a.${sortBy}`, direction)
      .addOrderBy('a.id', direction)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  findById(id: number): Promise<Appointment | null> {
    return this.repo.findOneBy({ id });
  }

  /** Update status hanya bila status di database masih sama dengan yang dibaca. */
  async transitionStatus(id: number, from: AppointmentStatus, to: AppointmentStatus): Promise<boolean> {
    const result = await this.repo.update({ id, status: from }, { status: to });
    return (result.affected ?? 0) > 0;
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.repo.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  // --- Operasi di dalam transaksi: selalu memakai EntityManager milik transaksi ---

  /** Mengunci baris dokter agar pemesanan untuk dokter yang sama diproses bergiliran. */
  lockDoctor(manager: EntityManager, doctorId: number): Promise<Doctor | null> {
    return manager.findOne(Doctor, { where: { id: doctorId }, lock: { mode: 'pessimistic_write' } });
  }

  findPatient(manager: EntityManager, patientId: number): Promise<Patient | null> {
    return manager.findOneBy(Patient, { id: patientId });
  }

  async nextQueueNumber(manager: EntityManager, doctorId: number, date: string): Promise<number> {
    const row = await manager
      .createQueryBuilder(Appointment, 'a')
      .select('COALESCE(MAX(a.queueNumber), 0) + 1', 'next')
      .where('a.doctorId = :doctorId AND a.appointmentDate = :date', { doctorId, date })
      .getRawOne<{ next: string }>();
    return Number(row?.next ?? 1);
  }

  insertInTransaction(manager: EntityManager, data: Partial<Appointment>): Promise<Appointment> {
    return manager.save(manager.create(Appointment, data));
  }

  countActive(manager: EntityManager, doctorId: number, date: string): Promise<number> {
    return manager
      .createQueryBuilder(Appointment, 'a')
      .where('a.doctorId = :doctorId AND a.appointmentDate = :date AND a.status <> :cancelled', {
        doctorId,
        date,
        cancelled: 'CANCELLED',
      })
      .getCount();
  }
}
