import { Injectable } from '@nestjs/common';
import { assertIfMatch, versionConflict } from '../common/etag.util';
import { paginate, Paginated } from '../common/pagination';
import { badRequest, notFound } from '../common/problem.exception';
import { CreatePatientDto, ListPatientsQueryDto, PatchPatientDto } from './dto/patient.dto';
import { Patient } from './patient.entity';
import { PatientsRepository } from './patients.repository';

function assertBirthDate(birthDate?: string): void {
  if (birthDate && birthDate > new Date().toISOString().slice(0, 10)) {
    throw badRequest('BIRTH_DATE_IN_FUTURE', 'Tanggal lahir tidak boleh di masa depan.');
  }
}

@Injectable()
export class PatientsService {
  constructor(private readonly patients: PatientsRepository) {}

  async list(query: ListPatientsQueryDto): Promise<Paginated<Patient>> {
    const [rows, total] = await this.patients.findPage(query);
    return paginate(rows, total, query.page, query.limit);
  }

  async get(id: number): Promise<Patient> {
    const patient = await this.patients.findById(id);
    if (!patient) throw notFound('PATIENT_NOT_FOUND', `Pasien dengan id ${id} tidak ditemukan.`);
    return patient;
  }

  async create(dto: CreatePatientDto): Promise<Patient> {
    assertBirthDate(dto.birthDate);
    return this.patients.insert({ ...dto, address: dto.address ?? null });
  }

  /** PUT: mengganti seluruh representasi; field opsional yang tidak dikirim menjadi null. */
  async replace(id: number, dto: CreatePatientDto, ifMatch?: string): Promise<Patient> {
    assertBirthDate(dto.birthDate);
    return this.applyUpdate(id, { ...dto, address: dto.address ?? null }, ifMatch);
  }

  /** PATCH: hanya mengubah field yang dikirim. */
  async patch(id: number, dto: PatchPatientDto, ifMatch?: string): Promise<Patient> {
    if (Object.keys(dto).length === 0) {
      throw badRequest('EMPTY_PATCH', 'Minimal satu field harus dikirim.');
    }
    assertBirthDate(dto.birthDate);
    return this.applyUpdate(id, dto, ifMatch);
  }

  async remove(id: number): Promise<void> {
    const deleted = await this.patients.deleteById(id);
    if (!deleted) throw notFound('PATIENT_NOT_FOUND', `Pasien dengan id ${id} tidak ditemukan.`);
  }

  private async applyUpdate(id: number, data: Partial<Patient>, ifMatch?: string): Promise<Patient> {
    const current = await this.get(id);
    assertIfMatch(ifMatch, current.version);
    const updated = await this.patients.updateIfVersion(id, current.version, data);
    if (!updated) throw versionConflict();
    return this.get(id);
  }
}
