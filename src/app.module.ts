import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsModule } from './appointments/appointments.module';
import { databaseOptions } from './database/data-source';
import { DoctorsModule } from './doctors/doctors.module';
import { PatientsModule } from './patients/patients.module';

@Module({
  imports: [TypeOrmModule.forRoot(databaseOptions()), PatientsModule, DoctorsModule, AppointmentsModule],
})
export class AppModule {}
