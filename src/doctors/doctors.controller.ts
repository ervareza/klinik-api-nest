import { Body, Controller, Delete, Get, Header, HttpCode, Param, Post, Put, Query, Res } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { IdParamPipe } from '../common/id-param.pipe';
import { ApiProblem } from '../common/problem-details.dto';
import { Doctor } from './doctor.entity';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto, DoctorListResponseDto, ListDoctorsQueryDto } from './dto/doctor.dto';

@ApiTags('doctors')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly service: DoctorsService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOperation({ summary: 'Daftar dokter (boleh di-cache 60 detik)' })
  @ApiOkResponse({ type: DoctorListResponseDto })
  @ApiProblem(400, 'Parameter query tidak valid')
  list(@Query() query: ListDoctorsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOperation({ summary: 'Detail dokter' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: Doctor })
  @ApiProblem(400, 'ID tidak valid')
  @ApiProblem(404, 'Dokter tidak ditemukan')
  get(@Param('id', IdParamPipe) id: number) {
    return this.service.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Menambah dokter' })
  @ApiCreatedResponse({ type: Doctor })
  @ApiProblem(400, 'Validasi gagal')
  @ApiProblem(409, 'Nomor SIP sudah terdaftar')
  async create(@Body() dto: CreateDoctorDto, @Res({ passthrough: true }) res: Response) {
    const doctor = await this.service.create(dto);
    res.setHeader('Location', `/api/v1/doctors/${doctor.id}`);
    return doctor;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Mengganti seluruh data dokter' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: Doctor })
  @ApiProblem(400, 'Validasi gagal')
  @ApiProblem(404, 'Dokter tidak ditemukan')
  @ApiProblem(409, 'Nomor SIP dipakai dokter lain')
  replace(@Param('id', IdParamPipe) id: number, @Body() dto: CreateDoctorDto) {
    return this.service.replace(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Menghapus dokter tanpa riwayat janji temu' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNoContentResponse({ description: 'Berhasil dihapus' })
  @ApiProblem(400, 'ID tidak valid')
  @ApiProblem(404, 'Dokter tidak ditemukan')
  @ApiProblem(409, 'Dokter masih memiliki riwayat janji temu')
  remove(@Param('id', IdParamPipe) id: number) {
    return this.service.remove(id);
  }
}
