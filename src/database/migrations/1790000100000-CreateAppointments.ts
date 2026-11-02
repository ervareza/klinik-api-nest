import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppointments1790000100000 implements MigrationInterface {
  name = 'CreateAppointments1790000100000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE appointments (
        id SERIAL CONSTRAINT pk_appointments PRIMARY KEY,
        patient_id INTEGER NOT NULL CONSTRAINT fk_appointments_patient
          REFERENCES patients (id) ON DELETE RESTRICT,
        doctor_id INTEGER NOT NULL CONSTRAINT fk_appointments_doctor
          REFERENCES doctors (id) ON DELETE RESTRICT,
        appointment_date DATE NOT NULL,
        queue_number INTEGER NOT NULL,
        complaint VARCHAR(500) NOT NULL,
        status VARCHAR(12) NOT NULL DEFAULT 'SCHEDULED' CONSTRAINT ck_appointments_status
          CHECK (status IN ('SCHEDULED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_appointments_doctor_date_queue UNIQUE (doctor_id, appointment_date, queue_number)
      )`);
    // Satu pasien hanya boleh punya satu janji aktif per dokter per tanggal
    await q.query(`
      CREATE UNIQUE INDEX uq_appointments_active_booking
      ON appointments (patient_id, doctor_id, appointment_date)
      WHERE status <> 'CANCELLED'`);
    await q.query(`CREATE INDEX ix_appointments_date ON appointments (appointment_date)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE appointments`);
  }
}
