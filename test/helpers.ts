import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  return app;
}

export const resetDb = (app: INestApplication) =>
  app.get(DataSource).query('TRUNCATE appointments, patients, doctors RESTART IDENTITY CASCADE');

export const patientBody = (n = 1, over: object = {}) => ({
  medicalRecordNumber: `RM-${String(n).padStart(6, '0')}`,
  nik: String(3273010000000000 + n),
  fullName: `Pasien ${n}`,
  birthDate: '1990-03-12',
  gender: 'FEMALE',
  phone: '+6281234567001',
  ...over,
});

export const doctorBody = (n = 1, over: object = {}) => ({
  licenseNumber: `SIP-2024-${String(n).padStart(4, '0')}`,
  fullName: `dr. Dokter ${n}`,
  specialty: 'UMUM',
  dailyQuota: 2,
  ...over,
});

export const FUTURE = '2035-06-15';
