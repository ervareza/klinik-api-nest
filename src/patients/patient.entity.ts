import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

export const GENDERS = ['MALE', 'FEMALE'] as const;
export type Gender = (typeof GENDERS)[number];

@Entity('patients')
export class Patient {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'RM-000001' })
  @Column({ name: 'medical_record_number', type: 'varchar', length: 9, unique: true })
  medicalRecordNumber: string;

  @ApiProperty({ example: '3273011203900001' })
  @Column({ type: 'char', length: 16, unique: true })
  nik: string;

  @ApiProperty({ example: 'Siti Rahmawati' })
  @Column({ name: 'full_name', type: 'varchar', length: 100 })
  fullName: string;

  @ApiProperty({ example: '1990-03-12' })
  @Column({ name: 'birth_date', type: 'date' })
  birthDate: string;

  @ApiProperty({ enum: GENDERS, example: 'FEMALE' })
  @Column({ type: 'varchar', length: 6 })
  gender: Gender;

  @ApiProperty({ example: '+6281234567001' })
  @Column({ type: 'varchar', length: 16 })
  phone: string;

  @ApiPropertyOptional({ example: 'Jl. Merdeka No. 10, Bandung', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @ApiProperty({ example: 1, description: 'Versi data; menjadi nilai ETag.' })
  @VersionColumn()
  version: number;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

