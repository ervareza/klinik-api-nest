import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiProperty, ApiPropertyOptional, ApiResponse, getSchemaPath } from '@nestjs/swagger';

export class FieldErrorDto {
  @ApiProperty({ example: 'nik' }) field: string;
  @ApiProperty({ example: 'nik harus terdiri dari 16 digit angka' }) message: string;
}

export class ProblemDetailsDto {
  @ApiProperty({ example: 'https://api.klinik.example/problems/validation-error' }) type: string;
  @ApiProperty({ example: 'Validasi gagal' }) title: string;
  @ApiProperty({ example: 400 }) status: number;
  @ApiProperty({ example: 'Satu atau lebih field tidak valid.' }) detail: string;
  @ApiProperty({ example: 'VALIDATION_ERROR' }) code: string;
  @ApiProperty({ example: '/api/v1/patients' }) instance: string;
  @ApiPropertyOptional({ type: [FieldErrorDto] }) errors?: FieldErrorDto[];
}

/** Mendokumentasikan response error berformat application/problem+json. */
export const ApiProblem = (status: number, description: string) =>
  applyDecorators(
    ApiExtraModels(ProblemDetailsDto),
    ApiResponse({
      status,
      description,
      content: { 'application/problem+json': { schema: { $ref: getSchemaPath(ProblemDetailsDto) } } },
    }),
  );
