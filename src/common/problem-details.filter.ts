import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ProblemBody, ProblemException, problemType } from './problem.exception';

/** Pemetaan constraint PostgreSQL ke pesan domain. */
const CONSTRAINTS: Record<string, { code: string; detail: string }> = {
  uq_patients_medical_record_number: {
    code: 'MEDICAL_RECORD_NUMBER_EXISTS',
    detail: 'Nomor rekam medis sudah terdaftar.',
  },
  uq_patients_nik: { code: 'NIK_EXISTS', detail: 'NIK sudah terdaftar.' },
  uq_doctors_license_number: { code: 'LICENSE_NUMBER_EXISTS', detail: 'Nomor SIP dokter sudah terdaftar.' },
  uq_appointments_doctor_date_queue: { code: 'QUEUE_NUMBER_EXISTS', detail: 'Nomor antrean sudah terpakai.' },
  uq_appointments_active_booking: {
    code: 'APPOINTMENT_ALREADY_BOOKED',
    detail: 'Pasien sudah memiliki janji aktif dengan dokter ini pada tanggal tersebut.',
  },
  fk_appointments_patient: {
    code: 'PATIENT_HAS_APPOINTMENTS',
    detail: 'Pasien tidak dapat dihapus karena masih memiliki riwayat janji temu.',
  },
  fk_appointments_doctor: {
    code: 'DOCTOR_HAS_APPOINTMENTS',
    detail: 'Dokter tidak dapat dihapus karena masih memiliki riwayat janji temu.',
  },
};

const HTTP_TITLES: Record<number, { code: string; title: string }> = {
  400: { code: 'BAD_REQUEST', title: 'Permintaan tidak valid' },
  404: { code: 'NOT_FOUND', title: 'Data tidak ditemukan' },
  405: { code: 'METHOD_NOT_ALLOWED', title: 'Method tidak didukung' },
  413: { code: 'PAYLOAD_TOO_LARGE', title: 'Body terlalu besar' },
};

export function toProblem(exception: unknown): ProblemBody {
  if (exception instanceof ProblemException) return exception.toBody();

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    // Nest membungkus SyntaxError dari body-parser menjadi BadRequestException
    if (status === 400 && /JSON|Unexpected (token|end)/i.test(exception.message)) {
      return {
        type: problemType('INVALID_JSON'),
        title: 'Permintaan tidak valid',
        status: 400,
        detail: 'Body request bukan JSON yang valid.',
        code: 'INVALID_JSON',
      };
    }
    const meta = HTTP_TITLES[status] ?? { code: 'HTTP_ERROR', title: 'Kesalahan HTTP' };
    return {
      type: problemType(meta.code),
      title: meta.title,
      status,
      detail: exception.message,
      code: meta.code,
    };
  }

  if (exception instanceof QueryFailedError) {
    const driver = exception.driverError as { code?: string; constraint?: string };
    if (driver.code === '23505' || driver.code === '23503') {
      const known = driver.constraint ? CONSTRAINTS[driver.constraint] : undefined;
      const code = known?.code ?? (driver.code === '23505' ? 'DUPLICATE_DATA' : 'REFERENCED_DATA');
      return {
        type: problemType(code),
        title: 'Konflik data',
        status: 409,
        detail: known?.detail ?? 'Operasi melanggar aturan relasi atau keunikan data.',
        code,
      };
    }
    // not_null_violation, check_violation, format/rentang nilai dari input klien
    if (['23502', '23514', '22P02', '22003', '22007', '22008'].includes(driver.code ?? '')) {
      return {
        type: problemType('INVALID_VALUE'),
        title: 'Permintaan tidak valid',
        status: 400,
        detail: 'Nilai yang dikirim melanggar aturan data.',
        code: 'INVALID_VALUE',
      };
    }
  }

  return {
    type: problemType('INTERNAL_SERVER_ERROR'),
    title: 'Kesalahan server',
    status: 500,
    detail: 'Terjadi kesalahan pada server.',
    code: 'INTERNAL_SERVER_ERROR',
  };
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ProblemDetails');

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();
    const body = toProblem(exception);
    if (body.status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }
    res
      .status(body.status)
      .setHeader('Content-Type', 'application/problem+json')
      .send(JSON.stringify({ ...body, instance: req.originalUrl }));
  }
}
