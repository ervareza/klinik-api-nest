import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { PageMetaDto, PageQueryDto } from '../../common/pagination';
import { Doctor, SPECIALTIES, Specialty } from '../doctor.entity';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateDoctorDto {
  @ApiProperty({ example: 'SIP-2024-0001' })
  @Matches(/^SIP-\d{4}-\d{4}$/, { message: 'licenseNumber harus berformat SIP-0000-0000' })
  licenseNumber: string;

  @ApiProperty({ example: 'dr. Hendra Wijaya', minLength: 2, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  fullName: string;

  @ApiProperty({ enum: SPECIALTIES, example: 'UMUM' })
  @IsIn(SPECIALTIES)
  specialty: Specialty;

  @ApiProperty({ example: 20, minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  dailyQuota: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export const DOCTOR_SORT = ['createdAt', 'fullName', 'specialty', 'licenseNumber'] as const;

export class ListDoctorsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ description: 'Cari pada nama atau nomor SIP.', example: 'hendra' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: SPECIALTIES })
  @IsOptional()
  @IsIn(SPECIALTIES)
  specialty?: Specialty;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: DOCTOR_SORT, default: 'createdAt' })
  @IsOptional()
  @IsIn(DOCTOR_SORT)
  sortBy: (typeof DOCTOR_SORT)[number] = 'createdAt';
}

export class DoctorListResponseDto {
  @ApiProperty({ type: [Doctor] }) data: Doctor[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}
