import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { Appointment } from './appointment.entity';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  const repo = {
    findById: jest.fn(),
    findPage: jest.fn(),
    lockDoctor: jest.fn(),
    findPatient: jest.fn(),
    nextQueueNumber: jest.fn(),
    insertInTransaction: jest.fn(),
    countActive: jest.fn(),
    transitionStatus: jest.fn(),
    deleteById: jest.fn(),
  };
  const dataSource = { transaction: (fn: (m: object) => unknown) => fn({}) };
  const dto = { patientId: 1, doctorId: 1, appointmentDate: '2035-01-01', complaint: 'Demam tinggi' };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: AppointmentsRepository, useValue: repo },
        { provide: DataSource, useValue: dataSource },
      ],
    })
      .setLogger(false as never)
      .compile();
    service = moduleRef.get(AppointmentsService);
  });

  it('[UNIT-22] tanggal masa lalu ditolak sebelum transaksi dimulai', async () => {
    await expect(service.book({ ...dto, appointmentDate: '2000-01-01' })).rejects.toMatchObject({ code: 'APPOINTMENT_DATE_IN_PAST' });
    expect(repo.lockDoctor).not.toHaveBeenCalled();
  });

  it('[UNIT-23] kuota terlampaui melempar QUOTA_FULL', async () => {
    repo.lockDoctor.mockResolvedValue({ id: 1, isActive: true, dailyQuota: 1 });
    repo.findPatient.mockResolvedValue({ id: 1 });
    repo.nextQueueNumber.mockResolvedValue(2);
    repo.insertInTransaction.mockResolvedValue({ id: 5 });
    repo.countActive.mockResolvedValue(2);
    await expect(service.book(dto)).rejects.toMatchObject({ code: 'QUOTA_FULL' });
  });

  it('[UNIT-24] dokter nonaktif ditolak', async () => {
    repo.lockDoctor.mockResolvedValue({ id: 1, isActive: false, dailyQuota: 1 });
    await expect(service.book(dto)).rejects.toMatchObject({ code: 'DOCTOR_INACTIVE' });
  });

  it.each([
    ['COMPLETED', 'SCHEDULED'],
    ['CANCELLED', 'CHECKED_IN'],
    ['SCHEDULED', 'COMPLETED'],
  ])('[UNIT-25] transisi status %s ke %s ditolak', async (from, to) => {
    repo.findById.mockResolvedValue({ id: 1, status: from } as Appointment);
    await expect(service.updateStatus(1, to as never)).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
  });

  it('[UNIT-26] janji yang sudah selesai tidak dapat dihapus', async () => {
    repo.findById.mockResolvedValue({ id: 1, status: 'COMPLETED' } as Appointment);
    await expect(service.remove(1)).rejects.toMatchObject({ code: 'APPOINTMENT_IN_PROGRESS' });
    expect(repo.deleteById).not.toHaveBeenCalled();
  });
});
