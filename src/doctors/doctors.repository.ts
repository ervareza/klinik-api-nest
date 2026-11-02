import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { likePattern } from '../common/pagination';
import { Doctor } from './doctor.entity';
import { ListDoctorsQueryDto } from './dto/doctor.dto';

@Injectable()
export class DoctorsRepository {
  constructor(@InjectRepository(Doctor) private readonly repo: Repository<Doctor>) {}

  async findPage(query: ListDoctorsQueryDto): Promise<[Doctor[], number]> {
    const { page, limit, q, specialty, isActive, sortBy, sortOrder } = query;
    const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';
    const qb = this.repo.createQueryBuilder('d');
    if (q) qb.andWhere('(d.fullName ILIKE :q OR d.licenseNumber ILIKE :q)', { q: likePattern(q) });
    if (specialty) qb.andWhere('d.specialty = :specialty', { specialty });
    if (isActive !== undefined) qb.andWhere('d.isActive = :isActive', { isActive });
    return qb
      .orderBy(`d.${sortBy}`, direction)
      .addOrderBy('d.id', direction)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  findById(id: number): Promise<Doctor | null> {
    return this.repo.findOneBy({ id });
  }

  insert(data: Partial<Doctor>): Promise<Doctor> {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: number, data: Partial<Doctor>): Promise<boolean> {
    const result = await this.repo.update({ id }, data);
    return (result.affected ?? 0) > 0;
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.repo.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
