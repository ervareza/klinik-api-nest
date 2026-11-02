import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export const SPECIALTIES = ['UMUM', 'GIGI', 'ANAK', 'KANDUNGAN', 'PENYAKIT_DALAM'] as const;
export type Specialty = (typeof SPECIALTIES)[number];

@Entity('doctors')
export class Doctor {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'SIP-2024-0001', description: 'Nomor Surat Izin Praktik' })
  @Column({ name: 'license_number', type: 'varchar', length: 20, unique: true })
  licenseNumber: string;

  @ApiProperty({ example: 'dr. Hendra Wijaya' })
  @Column({ name: 'full_name', type: 'varchar', length: 100 })
  fullName: string;

  @ApiProperty({ enum: SPECIALTIES, example: 'UMUM' })
  @Column({ type: 'varchar', length: 20 })
  specialty: Specialty;

  @ApiProperty({ example: 20, description: 'Kuota pasien per hari' })
  @Column({ name: 'daily_quota', type: 'int' })
  dailyQuota: number;

  @ApiProperty({ example: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
