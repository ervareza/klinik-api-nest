import { Injectable, PipeTransform } from '@nestjs/common';
import { badRequest } from './problem.exception';

const MAX_INT4 = 2147483647;

/** ID harus bilangan bulat positif yang muat di kolom INTEGER PostgreSQL. */
@Injectable()
export class IdParamPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const id = Number(value);
    if (!/^\d+$/.test(value) || id < 1 || id > MAX_INT4) {
      throw badRequest('INVALID_ID', 'ID harus berupa bilangan bulat positif.');
    }
    return id;
  }
}
