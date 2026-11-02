import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';
import { PageMetaDto, PageQueryDto } from '../../common/pagination';
import { Appointment, APPOINTMENT_STATUSES, AppointmentStatus } from '../appointment.entity';

const MAX_INT4 = 2147483647;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MSG = 'harus berformat tanggal YYYY-MM-DD';

export class CreateAppointmentDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  patientId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  doctorId: number;

  @ApiProperty({ example: '2030-01-15', format: 'date' })
  @IsISO8601({ strict: true }, { message: `appointmentDate ${DATE_MSG}` })
  @Matches(DATE_RE, { message: `appointmentDate ${DATE_MSG}` })
  appointmentDate: string;

  @ApiProperty({ example: 'Demam dan batuk sejak tiga hari lalu', minLength: 5, maxLength: 500 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(5, 500)
  complaint: string;
}

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: APPOINTMENT_STATUSES, example: 'CHECKED_IN' })
  @IsIn(APPOINTMENT_STATUSES)
  status: AppointmentStatus;
}

export const APPOINTMENT_SORT = ['appointmentDate', 'queueNumber', 'createdAt'] as const;

export class ListAppointmentsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  patientId?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  doctorId?: number;

  @ApiPropertyOptional({ enum: APPOINTMENT_STATUSES })
  @IsOptional()
  @IsIn(APPOINTMENT_STATUSES)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ format: 'date', example: '2030-01-01' })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: `dateFrom ${DATE_MSG}` })
  @Matches(DATE_RE, { message: `dateFrom ${DATE_MSG}` })
  dateFrom?: string;

  @ApiPropertyOptional({ format: 'date', example: '2030-01-31' })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: `dateTo ${DATE_MSG}` })
  @Matches(DATE_RE, { message: `dateTo ${DATE_MSG}` })
  dateTo?: string;

  @ApiPropertyOptional({ enum: APPOINTMENT_SORT, default: 'appointmentDate' })
  @IsOptional()
  @IsIn(APPOINTMENT_SORT)
  sortBy: (typeof APPOINTMENT_SORT)[number] = 'appointmentDate';
}

export class AppointmentListResponseDto {
  @ApiProperty({ type: [Appointment] }) data: Appointment[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}
