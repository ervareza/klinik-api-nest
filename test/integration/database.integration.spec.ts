import { INestApplication } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { AppointmentsService } from '../../src/appointments/appointments.service';
import { Appointment } from '../../src/appointments/appointment.entity';
import { DoctorsRepository } from '../../src/doctors/doctors.repository';
import { ListPatientsQueryDto } from '../../src/patients/dto/patient.dto';
import { Patient } from '../../src/patients/patient.entity';
import { PatientsRepository } from '../../src/patients/patients.repository';
import { createTestApp, doctorBody, FUTURE, patientBody, resetDb } from '../helpers';

const pgCode = (e: unknown) => (e as QueryFailedError).driverError as unknown as { code: string };

describe('Integrasi repository + PostgreSQL', () => {
  let app: INestApplication;
  let ds: DataSource;
  let patients: PatientsRepository;
  let doctors: DoctorsRepository;

  beforeAll(async () => {
    app = await createTestApp();
    ds = app.get(DataSource);
    patients = app.get(PatientsRepository);
    doctors = app.get(DoctorsRepository);
  });
  beforeEach(() => resetDb(app));
  afterAll(() => app.close());

  const newPatient = (n = 1, over = {}) => patients.insert(patientBody(n, over) as Partial<Patient>);
  const query = (over = {}) => Object.assign(new ListPatientsQueryDto(), over);

  it('[INT-01] seluruh migration sudah diterapkan', async () => {
    const rows = await ds.query('SELECT name FROM migrations ORDER BY id');
    expect(rows.map((r: { name: string }) => r.name)).toEqual([
      'CreatePatientsAndDoctors1790000000000',
      'CreateAppointments1790000100000',
    ]);
  });

  it('[INT-02] constraint UNIQUE menolak NIK duplikat (23505)', async () => {
    await newPatient(1);
    const err = await newPatient(2, { nik: patientBody(1).nik }).catch((e) => e);
    expect(pgCode(err).code).toBe('23505');
  });

  it('[INT-03] constraint NOT NULL menolak nama kosong (23502)', async () => {
    const err = await ds
      .query(`INSERT INTO patients (medical_record_number, nik, birth_date, gender, phone)
              VALUES ('RM-000009','3273010000000009','1990-01-01','MALE','08123456789')`)
      .catch((e) => e);
    expect(pgCode(err).code).toBe('23502');
  });

  it('[INT-04] constraint CHECK menolak kuota dokter nol (23514)', async () => {
    const err = await doctors.insert(doctorBody(1, { dailyQuota: 0 }) as never).catch((e) => e);
    expect(pgCode(err).code).toBe('23514');
  });

  it('[INT-05] foreign key menolak penghapusan pasien yang punya janji (23503)', async () => {
    const patient = await newPatient(1);
    const doctor = await doctors.insert(doctorBody(1) as never);
    await app.get(AppointmentsService).book({ patientId: patient.id, doctorId: doctor.id, appointmentDate: FUTURE, complaint: 'Sakit kepala' });
    const err = await patients.deleteById(patient.id).catch((e) => e);
    expect(pgCode(err).code).toBe('23503');
  });

  it('[INT-06] update versi lama tidak mengubah baris dan versi naik saat berhasil', async () => {
    const patient = await newPatient(1);
    expect(await patients.updateIfVersion(patient.id, patient.version + 5, { fullName: 'Tidak Boleh' })).toBe(false);
    expect(await patients.updateIfVersion(patient.id, patient.version, { fullName: 'Nama Baru' })).toBe(true);
    const fresh = await patients.findById(patient.id);
    expect(fresh).toMatchObject({ fullName: 'Nama Baru', version: patient.version + 1 });
  });

  it('[INT-07] sorting dengan nilai sama stabil karena tie-breaker id', async () => {
    for (let n = 1; n <= 6; n++) await newPatient(n, { fullName: 'Nama Sama' });
    const seen: number[] = [];
    for (const page of [1, 2, 3]) {
      const [rows] = await patients.findPage(query({ page, limit: 2, sortBy: 'fullName', sortOrder: 'asc' }));
      seen.push(...rows.map((r) => r.id));
    }
    expect(seen).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('[INT-08] pencarian memperlakukan % sebagai teks, bukan wildcard', async () => {
    await newPatient(1, { fullName: 'Budi' });
    const [rows, total] = await patients.findPage(query({ q: '%' }));
    expect(rows).toHaveLength(0);
    expect(total).toBe(0);
  });

  describe('Transaksi pemesanan', () => {
    it('[INT-09] COMMIT: janji temu tersimpan dengan nomor antrean berurutan', async () => {
      const p1 = await newPatient(1);
      const p2 = await newPatient(2);
      const doctor = await doctors.insert(doctorBody(1) as never);
      const service = app.get(AppointmentsService);
      const a1 = await service.book({ patientId: p1.id, doctorId: doctor.id, appointmentDate: FUTURE, complaint: 'Keluhan satu' });
      const a2 = await service.book({ patientId: p2.id, doctorId: doctor.id, appointmentDate: FUTURE, complaint: 'Keluhan dua' });
      expect([a1.queueNumber, a2.queueNumber]).toEqual([1, 2]);
      expect(await ds.getRepository(Appointment).count()).toBe(2);
    });

    it('[INT-10] ROLLBACK: kuota penuh membatalkan insert yang sudah dilakukan', async () => {
      const p1 = await newPatient(1);
      const p2 = await newPatient(2);
      const doctor = await doctors.insert(doctorBody(1, { dailyQuota: 1 }) as never);
      const service = app.get(AppointmentsService);
      await service.book({ patientId: p1.id, doctorId: doctor.id, appointmentDate: FUTURE, complaint: 'Keluhan satu' });
      await expect(
        service.book({ patientId: p2.id, doctorId: doctor.id, appointmentDate: FUTURE, complaint: 'Keluhan dua' }),
      ).rejects.toMatchObject({ code: 'QUOTA_FULL' });
      const rows = await ds.getRepository(Appointment).find();
      expect(rows).toHaveLength(1);
      expect(rows[0].patientId).toBe(p1.id);
    });

    it('[INT-11] pemesanan bersamaan tidak melampaui kuota (row lock)', async () => {
      const doctor = await doctors.insert(doctorBody(1, { dailyQuota: 2 }) as never);
      const list = await Promise.all([1, 2, 3, 4, 5].map((n) => newPatient(n)));
      const service = app.get(AppointmentsService);
      const results = await Promise.allSettled(
        list.map((p) => service.book({ patientId: p.id, doctorId: doctor.id, appointmentDate: FUTURE, complaint: 'Antre bersamaan' })),
      );
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
      expect(await ds.getRepository(Appointment).count()).toBe(2);
    });
  });
});
