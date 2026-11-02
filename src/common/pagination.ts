import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class PageQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 1000000, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}

export class PageMetaDto {
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 10 }) limit: number;
  @ApiProperty({ example: 42 }) totalItems: number;
  @ApiProperty({ example: 5 }) totalPages: number;
  @ApiProperty({ example: true }) hasNextPage: boolean;
  @ApiProperty({ example: false }) hasPrevPage: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMetaDto;
}

export function paginate<T>(data: T[], totalItems: number, page: number, limit: number): Paginated<T> {
  const totalPages = Math.ceil(totalItems / limit) || 1;
  return {
    data,
    meta: { page, limit, totalItems, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
  };
}

/** Escape wildcard LIKE agar input pengguna diperlakukan sebagai teks biasa. */
export const likePattern = (q: string): string => `%${q.replace(/[\\%_]/g, '\\$&')}%`;
