import { HttpException } from '@nestjs/common';

export interface FieldError {
  field: string;
  message: string;
}

export interface ProblemBody {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  instance?: string;
  errors?: FieldError[];
}

export const PROBLEM_BASE = 'https://api.klinik.example/problems/';

export function problemType(code: string): string {
  return PROBLEM_BASE + code.toLowerCase().replace(/_/g, '-');
}

/** Exception domain yang dirender sebagai RFC 9457 Problem Details. */
export class ProblemException extends HttpException {
  constructor(
    status: number,
    public readonly code: string,
    public readonly title: string,
    public readonly detail: string,
    public readonly errors?: FieldError[],
  ) {
    super(detail, status);
  }

  toBody(): ProblemBody {
    return {
      type: problemType(this.code),
      title: this.title,
      status: this.getStatus(),
      detail: this.detail,
      code: this.code,
      ...(this.errors ? { errors: this.errors } : {}),
    };
  }
}

export const notFound = (code: string, detail: string) =>
  new ProblemException(404, code, 'Data tidak ditemukan', detail);

export const conflict = (code: string, detail: string) =>
  new ProblemException(409, code, 'Konflik data', detail);

export const badRequest = (code: string, detail: string) =>
  new ProblemException(400, code, 'Permintaan tidak valid', detail);
