import { Injectable } from '@nestjs/common';
import { paginate, Paginated } from '../common/pagination';
import { notFound } from '../common/problem.exception';
import { Doctor } from './doctor.entity';
import { DoctorsRepository } from './doctors.repository';
import { CreateDoctorDto, ListDoctorsQueryDto } from './dto/doctor.dto';

@Injectable()
export class DoctorsService {
  constructor(private readonly doctors: DoctorsRepository) {}

  async list(query: ListDoctorsQueryDto): Promise<Paginated<Doctor>> {
    const [rows, total] = await this.doctors.findPage(query);
    return paginate(rows, total, query.page, query.limit);
  }

  async get(id: number): Promise<Doctor> {
    const doctor = await this.doctors.findById(id);
    if (!doctor) throw notFound('DOCTOR_NOT_FOUND', `Dokter dengan id ${id} tidak ditemukan.`);
    return doctor;
  }

  create(dto: CreateDoctorDto): Promise<Doctor> {
    return this.doctors.insert(dto);
  }

  async replace(id: number, dto: CreateDoctorDto): Promise<Doctor> {
    await this.get(id);
    await this.doctors.update(id, { ...dto, isActive: dto.isActive ?? true });
    return this.get(id);
  }

  async remove(id: number): Promise<void> {
    const deleted = await this.doctors.deleteById(id);
    if (!deleted) throw notFound('DOCTOR_NOT_FOUND', `Dokter dengan id ${id} tidak ditemukan.`);
  }
}
