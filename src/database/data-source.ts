import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Appointment } from '../appointments/appointment.entity';
import { Doctor } from '../doctors/doctor.entity';
import { Patient } from '../patients/patient.entity';

dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

export function databaseOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD || undefined,
    database: process.env.DB_NAME,
    entities: [Patient, Doctor, Appointment],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    // Schema hanya boleh berubah lewat migration
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
  };
}

export default new DataSource(databaseOptions());
