import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsISO8601, IsOptional, IsString, Length, Matches, MaxLength, IsNotEmpty } from 'class-validator';
import { PageMetaDto, PageQueryDto } from '../../common/pagination';
import { GENDERS, Gender, Patient } from '../patient.entity';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreatePatientDto {
  @ApiProperty({ example: 'RM-000001', description: 'Format RM-diikuti 6 digit.' })
  @Matches(/^RM-\d{6}$/, { message: 'medicalRecordNumber harus berformat RM-000000' })
  medicalRecordNumber: string;

  @ApiProperty({ example: '3273011203900001', description: 'NIK 16 digit.' })
  @Matches(/^\d{16}$/, { message: 'nik harus terdiri dari 16 digit angka' })
  nik: string;

  @ApiProperty({ example: 'Siti Rahmawati', minLength: 2, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  fullName: string;

  @ApiProperty({ example: '1990-03-12', format: 'date' })
  @IsISO8601({ strict: true }, { message: 'birthDate harus berformat tanggal YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'birthDate harus berformat tanggal YYYY-MM-DD' })
  birthDate: string;

  @ApiProperty({ enum: GENDERS, example: 'FEMALE' })
  @IsIn(GENDERS)
  gender: Gender;

  @ApiProperty({ example: '+6281234567001' })
  @Matches(/^\+?\d{8,15}$/, { message: 'phone harus 8-15 digit, boleh diawali +' })
  phone: string;

  @ApiPropertyOptional({ example: 'Jl. Merdeka No. 10, Bandung', maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  address?: string | null;
}

export class PatchPatientDto extends PartialType(CreatePatientDto) {}

export const PATIENT_SORT = ['createdAt', 'fullName', 'birthDate', 'medicalRecordNumber'] as const;

export class ListPatientsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ description: 'Cari pada nama atau nomor rekam medis.', example: 'siti' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: GENDERS })
  @IsOptional()
  @IsIn(GENDERS)
  gender?: Gender;

  @ApiPropertyOptional({ enum: PATIENT_SORT, default: 'createdAt' })
  @IsOptional()
  @IsIn(PATIENT_SORT)
  sortBy: (typeof PATIENT_SORT)[number] = 'createdAt';
}

export class PatientListResponseDto {
  @ApiProperty({ type: [Patient] }) data: Patient[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}
