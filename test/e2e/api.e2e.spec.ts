import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, doctorBody, FUTURE, patientBody, resetDb } from '../helpers';

const P = '/api/v1/patients';
const D = '/api/v1/doctors';
const A = '/api/v1/appointments';

describe('E2E REST API Klinik', () => {
  let app: INestApplication;
  let http: () => ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = () => request(app.getHttpServer());
  });
  beforeEach(() => resetDb(app));
  afterAll(() => app.close());

  const addPatient = async (n = 1, over = {}) => (await http().post(P).send(patientBody(n, over)).expect(201)).body;
  const addDoctor = async (n = 1, over = {}) => (await http().post(D).send(doctorBody(n, over)).expect(201)).body;
  const expectProblem = (res: request.Response, status: number, code: string) => {
    expect(res.status).toBe(status);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body).toMatchObject({ status, code, type: expect.any(String), title: expect.any(String), instance: expect.any(String) });
  };

  describe('Skenario berhasil', () => {
    it('[E2E-01] POST /patients 201 dengan Location dan ETag', async () => {
      const res = await http().post(P).send(patientBody()).expect(201);
      expect(res.body).toMatchObject({ id: 1, version: 1, address: null });
      expect(res.headers.location).toBe(`${P}/1`);
      expect(res.headers.etag).toBe('"1"');
    });

    it('[E2E-02] GET /patients/:id 200 dengan ETag', async () => {
      await addPatient();
      const res = await http().get(`${P}/1`).set('Accept', 'application/json').expect(200);
      expect(res.headers.etag).toBe('"1"');
      expect(res.headers['content-type']).toContain('application/json');
    });

    it('[E2E-03] GET dengan If-None-Match cocok 304 tanpa body', async () => {
      await addPatient();
      const res = await http().get(`${P}/1`).set('If-None-Match', '"1"').expect(304);
      expect(res.text).toBeFalsy();
    });

    it('[E2E-04] PUT dengan If-Match 200 mengganti data dan menaikkan versi', async () => {
      await addPatient(1, { address: 'Alamat lama' });
      const res = await http().put(`${P}/1`).set('If-Match', '"1"').send(patientBody(1, { fullName: 'Nama Baru' })).expect(200);
      expect(res.body).toMatchObject({ fullName: 'Nama Baru', version: 2, address: null });
      expect(res.headers.etag).toBe('"2"');
    });

    it('[E2E-05] PATCH dengan If-Match hanya mengubah field terkirim', async () => {
      await addPatient(1, { address: 'Tetap' });
      const res = await http().patch(`${P}/1`).set('If-Match', '"1"').send({ phone: '+6289999999' }).expect(200);
      expect(res.body).toMatchObject({ phone: '+6289999999', address: 'Tetap', version: 2 });
    });

    it('[E2E-06] DELETE 204 lalu GET 404', async () => {
      await addPatient();
      const res = await http().delete(`${P}/1`).expect(204);
      expect(res.text).toBe('');
      await http().get(`${P}/1`).expect(404);
    });

    it('[E2E-07] pagination, filter, sorting pasien', async () => {
      for (let n = 1; n <= 5; n++) await addPatient(n, { gender: n % 2 ? 'FEMALE' : 'MALE' });
      const res = await http().get(P).query({ gender: 'FEMALE', page: 2, limit: 2, sortBy: 'medicalRecordNumber', sortOrder: 'asc' }).expect(200);
      expect(res.body.data.map((p: { id: number }) => p.id)).toEqual([5]);
      expect(res.body.meta).toEqual({ page: 2, limit: 2, totalItems: 3, totalPages: 2, hasNextPage: false, hasPrevPage: true });
    });

    it('[E2E-08] pencarian q pada pasien tidak peka huruf besar/kecil', async () => {
      await addPatient(1, { fullName: 'Siti Rahmawati' });
      await addPatient(2, { fullName: 'Agus' });
      const res = await http().get(P).query({ q: 'SITI' }).expect(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('[E2E-09] CRUD dokter dan filter isActive=false', async () => {
      await addDoctor(1);
      await addDoctor(2, { isActive: false });
      const res = await http().get(D).query({ isActive: 'false' }).expect(200);
      expect(res.body.data.map((d: { id: number }) => d.id)).toEqual([2]);
      expect(res.headers['cache-control']).toBe('public, max-age=60');
      await http().put(`${D}/1`).send(doctorBody(1, { fullName: 'dr. Ganti Nama' })).expect(200);
      await http().delete(`${D}/1`).expect(204);
    });

    it('[E2E-10] alur janji temu SCHEDULED > CHECKED_IN > COMPLETED', async () => {
      await addPatient();
      await addDoctor();
      const created = await http().post(A).send({ patientId: 1, doctorId: 1, appointmentDate: FUTURE, complaint: 'Demam tinggi' }).expect(201);
      expect(created.body).toMatchObject({ queueNumber: 1, status: 'SCHEDULED', appointmentDate: FUTURE });
      await http().patch(`${A}/1`).send({ status: 'CHECKED_IN' }).expect(200);
      const done = await http().patch(`${A}/1`).send({ status: 'COMPLETED' }).expect(200);
      expect(done.body.status).toBe('COMPLETED');
    });

    it('[E2E-11] janji dibatalkan membebaskan kuota dan pasien bisa memesan lagi', async () => {
      await addPatient();
      await addDoctor(1, { dailyQuota: 1 });
      const body = { patientId: 1, doctorId: 1, appointmentDate: FUTURE, complaint: 'Demam tinggi' };
      await http().post(A).send(body).expect(201);
      await http().patch(`${A}/1`).send({ status: 'CANCELLED' }).expect(200);
      const again = await http().post(A).send(body).expect(201);
      expect(again.body.queueNumber).toBe(2);
    });

    it('[E2E-12] filter janji temu berdasarkan rentang tanggal', async () => {
      await addPatient();
      await addDoctor();
      await http().post(A).send({ patientId: 1, doctorId: 1, appointmentDate: '2035-01-10', complaint: 'Keluhan A' }).expect(201);
      await http().post(A).send({ patientId: 1, doctorId: 1, appointmentDate: '2035-02-10', complaint: 'Keluhan B' }).expect(201);
      const res = await http().get(A).query({ dateFrom: '2035-02-01', dateTo: '2035-02-28' }).expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].appointmentDate).toBe('2035-02-10');
    });
  });

  describe('Validasi gagal (400)', () => {
    it.each([
      ['medicalRecordNumber format salah', { medicalRecordNumber: 'ABC' }, 'medicalRecordNumber'],
      ['NIK 15 digit', { nik: '327301000000000' }, 'nik'],
      ['NIK berisi huruf', { nik: '32730100000000AB' }, 'nik'],
      ['nama 1 karakter', { fullName: 'A' }, 'fullName'],
      ['nama hanya spasi', { fullName: '    ' }, 'fullName'],
      ['tanggal lahir bukan tanggal', { birthDate: '12-03-1990' }, 'birthDate'],
      ['tanggal 30 Februari', { birthDate: '2024-02-30' }, 'birthDate'],
      ['gender tidak terdaftar', { gender: 'OTHER' }, 'gender'],
      ['telepon berisi huruf', { phone: 'abcdefghij' }, 'phone'],
      ['tipe data salah: NIK number', { nik: 3273010000000001 }, 'nik'],
    ])('[E2E-13] POST /patients menolak %s', async (_name, over, field) => {
      const res = await http().post(P).send(patientBody(1, over));
      expectProblem(res, 400, 'VALIDATION_ERROR');
      expect(res.body.errors.map((e: { field: string }) => e.field)).toContain(field);
    });

    it('[E2E-14] body kosong melaporkan semua field wajib', async () => {
      const res = await http().post(P).send({});
      expectProblem(res, 400, 'VALIDATION_ERROR');
      const fields = res.body.errors.map((e: { field: string }) => e.field);
      expect(fields).toEqual(expect.arrayContaining(['medicalRecordNumber', 'nik', 'fullName', 'birthDate', 'gender', 'phone']));
    });

    it('[E2E-15] field tak dikenal ditolak', async () => {
      const res = await http().post(P).send(patientBody(1, { isAdmin: true }));
      expectProblem(res, 400, 'VALIDATION_ERROR');
    });

    it('[E2E-16] JSON rusak menghasilkan 400, bukan 500', async () => {
      const res = await http().post(P).set('Content-Type', 'application/json').send('{"nik":');
      expectProblem(res, 400, 'INVALID_JSON');
    });

    it('[E2E-17] tanggal lahir masa depan ditolak', async () => {
      expectProblem(await http().post(P).send(patientBody(1, { birthDate: '2999-01-01' })), 400, 'BIRTH_DATE_IN_FUTURE');
    });

    it('[E2E-18] PATCH body kosong ditolak', async () => {
      await addPatient();
      expectProblem(await http().patch(`${P}/1`).set('If-Match', '"1"').send({}), 400, 'EMPTY_PATCH');
    });

    it('[E2E-19] PATCH mengosongkan field wajib dengan null ditolak', async () => {
      await addPatient();
      expectProblem(await http().patch(`${P}/1`).set('If-Match', '"1"').send({ fullName: null }), 400, 'INVALID_VALUE');
    });

    it.each(['abc', '0', '-1', '1.5', '99999999999'])('[E2E-20] ID tidak valid "%s" ditolak', async (id) => {
      expectProblem(await http().get(`${P}/${id}`), 400, 'INVALID_ID');
    });

    it.each([
      ['page=0', { page: 0 }],
      ['page=abc', { page: 'abc' }],
      ['page=1.5', { page: 1.5 }],
      ['limit=0', { limit: 0 }],
      ['limit=101', { limit: 101 }],
      ['sortBy kolom tak dikenal', { sortBy: 'password' }],
      ['sortOrder salah', { sortOrder: 'acak' }],
      ['gender salah', { gender: 'X' }],
    ])('[E2E-21] query pasien %s ditolak', async (_name, query) => {
      expectProblem(await http().get(P).query(query), 400, 'VALIDATION_ERROR');
    });

    it('[E2E-22] kuota dokter 0 ditolak validasi', async () => {
      expectProblem(await http().post(D).send(doctorBody(1, { dailyQuota: 0 })), 400, 'VALIDATION_ERROR');
    });

    it('[E2E-23] spesialis tidak terdaftar ditolak', async () => {
      expectProblem(await http().post(D).send(doctorBody(1, { specialty: 'BEDAH' })), 400, 'VALIDATION_ERROR');
    });

    it('[E2E-24] janji temu tanggal masa lalu ditolak', async () => {
      expectProblem(await http().post(A).send({ patientId: 1, doctorId: 1, appointmentDate: '2000-01-01', complaint: 'Demam tinggi' }), 400, 'APPOINTMENT_DATE_IN_PAST');
    });

    it('[E2E-25] rentang tanggal terbalik ditolak', async () => {
      expectProblem(await http().get(A).query({ dateFrom: '2035-02-01', dateTo: '2035-01-01' }), 400, 'INVALID_DATE_RANGE');
    });

    it('[E2E-26] status janji temu tidak terdaftar ditolak', async () => {
      expectProblem(await http().patch(`${A}/1`).send({ status: 'SELESAI' }), 400, 'VALIDATION_ERROR');
    });
  });

  describe('Data tidak ditemukan (404)', () => {
    it('[E2E-27] GET pasien tidak ada', async () => {
      expectProblem(await http().get(`${P}/999`), 404, 'PATIENT_NOT_FOUND');
    });
    it('[E2E-28] PATCH pasien tidak ada', async () => {
      expectProblem(await http().patch(`${P}/999`).set('If-Match', '"1"').send({ fullName: 'Nama Baru' }), 404, 'PATIENT_NOT_FOUND');
    });
    it('[E2E-29] DELETE pasien tidak ada', async () => {
      expectProblem(await http().delete(`${P}/999`), 404, 'PATIENT_NOT_FOUND');
    });
    it('[E2E-30] GET dokter tidak ada', async () => {
      expectProblem(await http().get(`${D}/999`), 404, 'DOCTOR_NOT_FOUND');
    });
    it('[E2E-31] pesan janji dengan dokter tidak ada', async () => {
      await addPatient();
      expectProblem(await http().post(A).send({ patientId: 1, doctorId: 999, appointmentDate: FUTURE, complaint: 'Demam tinggi' }), 404, 'DOCTOR_NOT_FOUND');
    });
    it('[E2E-32] pesan janji dengan pasien tidak ada', async () => {
      await addDoctor();
      expectProblem(await http().post(A).send({ patientId: 999, doctorId: 1, appointmentDate: FUTURE, complaint: 'Demam tinggi' }), 404, 'PATIENT_NOT_FOUND');
    });
    it('[E2E-33] route tidak dikenal tetap Problem Details', async () => {
      expectProblem(await http().get('/api/v1/obat'), 404, 'NOT_FOUND');
    });
  });

  describe('Konflik data (409/412/428)', () => {
    it('[E2E-34] nomor rekam medis duplikat', async () => {
      await addPatient(1);
      expectProblem(await http().post(P).send(patientBody(2, { medicalRecordNumber: patientBody(1).medicalRecordNumber })), 409, 'MEDICAL_RECORD_NUMBER_EXISTS');
    });
    it('[E2E-35] NIK duplikat', async () => {
      await addPatient(1);
      expectProblem(await http().post(P).send(patientBody(2, { nik: patientBody(1).nik })), 409, 'NIK_EXISTS');
    });
    it('[E2E-36] PATCH NIK milik pasien lain', async () => {
      await addPatient(1);
      await addPatient(2);
      expectProblem(await http().patch(`${P}/2`).set('If-Match', '"1"').send({ nik: patientBody(1).nik }), 409, 'NIK_EXISTS');
    });
    it('[E2E-37] nomor SIP dokter duplikat', async () => {
      await addDoctor(1);
      expectProblem(await http().post(D).send(doctorBody(1)), 409, 'LICENSE_NUMBER_EXISTS');
    });
    it('[E2E-38] hapus pasien yang punya janji temu', async () => {
      await addPatient();
      await addDoctor();
      await http().post(A).send({ patientId: 1, doctorId: 1, appointmentDate: FUTURE, complaint: 'Demam tinggi' }).expect(201);
      expectProblem(await http().delete(`${P}/1`), 409, 'PATIENT_HAS_APPOINTMENTS');
    });
    it('[E2E-39] hapus dokter yang punya janji temu', async () => {
      await addPatient();
      await addDoctor();
      await http().post(A).send({ patientId: 1, doctorId: 1, appointmentDate: FUTURE, complaint: 'Demam tinggi' }).expect(201);
      expectProblem(await http().delete(`${D}/1`), 409, 'DOCTOR_HAS_APPOINTMENTS');
    });
    it('[E2E-40] kuota penuh: 409 dan janji kedua tidak tersimpan (rollback)', async () => {
      await addPatient(1);
      await addPatient(2);
      await addDoctor(1, { dailyQuota: 1 });
      await http().post(A).send({ patientId: 1, doctorId: 1, appointmentDate: FUTURE, complaint: 'Demam tinggi' }).expect(201);
      expectProblem(await http().post(A).send({ patientId: 2, doctorId: 1, appointmentDate: FUTURE, complaint: 'Batuk pilek' }), 409, 'QUOTA_FULL');
      const list = await http().get(A).expect(200);
      expect(list.body.meta.totalItems).toBe(1);
    });
    it('[E2E-41] pasien memesan dokter yang sama dua kali pada tanggal sama', async () => {
      await addPatient();
      await addDoctor();
      const body = { patientId: 1, doctorId: 1, appointmentDate: FUTURE, complaint: 'Demam tinggi' };
      await http().post(A).send(body).expect(201);
      expectProblem(await http().post(A).send(body), 409, 'APPOINTMENT_ALREADY_BOOKED');
    });
    it('[E2E-42] dokter nonaktif tidak bisa dipesan', async () => {
      await addPatient();
      await addDoctor(1, { isActive: false });
      expectProblem(await http().post(A).send({ patientId: 1, doctorId: 1, appointmentDate: FUTURE, complaint: 'Demam tinggi' }), 409, 'DOCTOR_INACTIVE');
    });
    it('[E2E-43] transisi status tidak sah', async () => {
      await addPatient();
      await addDoctor();
      await http().post(A).send({ patientId: 1, doctorId: 1, appointmentDate: FUTURE, complaint: 'Demam tinggi' }).expect(201);
      expectProblem(await http().patch(`${A}/1`).send({ status: 'COMPLETED' }), 409, 'INVALID_STATUS_TRANSITION');
    });
    it('[E2E-44] PATCH tanpa If-Match: 428', async () => {
      await addPatient();
      expectProblem(await http().patch(`${P}/1`).send({ fullName: 'Nama Baru' }), 428, 'PRECONDITION_REQUIRED');
    });
    it('[E2E-45] lost update dicegah: klien kedua dengan ETag lama mendapat 412', async () => {
      await addPatient();
      await http().patch(`${P}/1`).set('If-Match', '"1"').send({ fullName: 'Klien Pertama' }).expect(200);
      expectProblem(await http().patch(`${P}/1`).set('If-Match', '"1"').send({ fullName: 'Klien Kedua' }), 412, 'VERSION_CONFLICT');
      const fresh = await http().get(`${P}/1`).expect(200);
      expect(fresh.body.fullName).toBe('Klien Pertama');
    });
  });

  it('[E2E-46] injeksi SQL pada q diperlakukan sebagai teks', async () => {
    await addPatient();
    const res = await http().get(P).query({ q: "' OR 1=1 --" }).expect(200);
    expect(res.body.data).toHaveLength(0);
  });
});
