import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePatientsAndDoctors1790000000000 implements MigrationInterface {
  name = 'CreatePatientsAndDoctors1790000000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE patients (
        id SERIAL CONSTRAINT pk_patients PRIMARY KEY,
        medical_record_number VARCHAR(9) NOT NULL CONSTRAINT uq_patients_medical_record_number UNIQUE,
        nik CHAR(16) NOT NULL CONSTRAINT uq_patients_nik UNIQUE,
        full_name VARCHAR(100) NOT NULL,
        birth_date DATE NOT NULL,
        gender VARCHAR(6) NOT NULL CONSTRAINT ck_patients_gender CHECK (gender IN ('MALE', 'FEMALE')),
        phone VARCHAR(16) NOT NULL,
        address VARCHAR(255),
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await q.query(`
      CREATE TABLE doctors (
        id SERIAL CONSTRAINT pk_doctors PRIMARY KEY,
        license_number VARCHAR(20) NOT NULL CONSTRAINT uq_doctors_license_number UNIQUE,
        full_name VARCHAR(100) NOT NULL,
        specialty VARCHAR(20) NOT NULL CONSTRAINT ck_doctors_specialty
          CHECK (specialty IN ('UMUM', 'GIGI', 'ANAK', 'KANDUNGAN', 'PENYAKIT_DALAM')),
        daily_quota INTEGER NOT NULL CONSTRAINT ck_doctors_daily_quota CHECK (daily_quota > 0),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await q.query(`CREATE INDEX ix_patients_full_name ON patients (full_name)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE doctors`);
    await q.query(`DROP TABLE patients`);
  }
}
