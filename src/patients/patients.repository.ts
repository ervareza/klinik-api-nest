import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { likePattern } from '../common/pagination';
import { ListPatientsQueryDto } from './dto/patient.dto';
import { Patient } from './patient.entity';

@Injectable()
export class PatientsRepository {
  constructor(@InjectRepository(Patient) private readonly repo: Repository<Patient>) {}

  async findPage(query: ListPatientsQueryDto): Promise<[Patient[], number]> {
    const { page, limit, q, gender, sortBy, sortOrder } = query;
    const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';
    const qb = this.repo.createQueryBuilder('p');
    if (q) qb.andWhere('(p.fullName ILIKE :q OR p.medicalRecordNumber ILIKE :q)', { q: likePattern(q) });
    if (gender) qb.andWhere('p.gender = :gender', { gender });
    return qb
      .orderBy(`p.${sortBy}`, direction)
      .addOrderBy('p.id', direction) // tie-breaker agar urutan stabil antar halaman
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  findById(id: number): Promise<Patient | null> {
    return this.repo.findOneBy({ id });
  }

  insert(data: Partial<Patient>): Promise<Patient> {
    return this.repo.save(this.repo.create(data));
  }

  /** Update atomik: hanya berhasil bila versi di database masih sama. */
  async updateIfVersion(id: number, version: number, data: Partial<Patient>): Promise<boolean> {
    const result = await this.repo
      .createQueryBuilder()
      .update(Patient)
      .set(data)
      .where('id = :id AND version = :version', { id, version })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.repo.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
