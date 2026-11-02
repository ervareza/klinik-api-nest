import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { toProblem } from './problem-details.filter';

const dbError = (code: string, constraint?: string) =>
  new QueryFailedError('q', [], Object.assign(new Error('db'), { code, constraint }));

describe('toProblem', () => {
  it('[UNIT-10] unique violation menjadi 409 dengan kode domain', () => {
    expect(toProblem(dbError('23505', 'uq_patients_nik'))).toMatchObject({ status: 409, code: 'NIK_EXISTS' });
  });
  it('[UNIT-11] foreign key violation menjadi 409', () => {
    expect(toProblem(dbError('23503', 'fk_appointments_patient'))).toMatchObject({ status: 409, code: 'PATIENT_HAS_APPOINTMENTS' });
  });
  it('[UNIT-12] not null violation menjadi 400', () => {
    expect(toProblem(dbError('23502'))).toMatchObject({ status: 400, code: 'INVALID_VALUE' });
  });
  it('[UNIT-13] JSON rusak dari body-parser menjadi 400 INVALID_JSON', () => {
    expect(toProblem(new BadRequestException('Unexpected end of JSON input'))).toMatchObject({ status: 400, code: 'INVALID_JSON' });
  });
  it('[UNIT-14] HttpException bawaan Nest tetap berformat Problem Details', () => {
    expect(toProblem(new NotFoundException('x'))).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
  it('[UNIT-15] error tak dikenal menjadi 500 tanpa membocorkan detail', () => {
    const problem = toProblem(new Error('password=rahasia'));
    expect(problem.status).toBe(500);
    expect(problem.detail).not.toContain('rahasia');
  });
});
