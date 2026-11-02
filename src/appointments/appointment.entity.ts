import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Doctor } from '../doctors/doctor.entity';
import { Patient } from '../patients/patient.entity';

export const APPOINTMENT_STATUSES = ['SCHEDULED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

@Entity('appointments')
export class Appointment {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column({ name: 'patient_id', type: 'int' })
  patientId: number;

  @ManyToOne(() => Patient, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient;

  @ApiProperty({ example: 1 })
  @Column({ name: 'doctor_id', type: 'int' })
  doctorId: number;

  @ManyToOne(() => Doctor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctor_id' })
  doctor?: Doctor;

  @ApiProperty({ example: '2030-01-15' })
  @Column({ name: 'appointment_date', type: 'date' })
  appointmentDate: string;

  @ApiProperty({ example: 1, description: 'Nomor antrean per dokter per tanggal' })
  @Column({ name: 'queue_number', type: 'int' })
  queueNumber: number;

  @ApiProperty({ example: 'Demam dan batuk sejak tiga hari lalu' })
  @Column({ type: 'varchar', length: 500 })
  complaint: string;

  @ApiProperty({ enum: APPOINTMENT_STATUSES, example: 'SCHEDULED' })
  @Column({ type: 'varchar', length: 12, default: 'SCHEDULED' })
  status: AppointmentStatus;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
