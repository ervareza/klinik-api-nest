import { Body, Controller, Delete, Get, Header, Headers, HttpCode, Param, Patch, Post, Put, Query, Res } from '@nestjs/common';
import { ApiHeader, ApiNoContentResponse, ApiOkResponse, ApiCreatedResponse, ApiOperation, ApiParam, ApiTags, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { toEtag } from '../common/etag.util';
import { IdParamPipe } from '../common/id-param.pipe';
import { ApiProblem } from '../common/problem-details.dto';
import { CreatePatientDto, ListPatientsQueryDto, PatchPatientDto, PatientListResponseDto } from './dto/patient.dto';
import { Patient } from './patient.entity';
import { PatientsService } from './patients.service';

const IF_MATCH = ApiHeader({ name: 'If-Match', required: true, description: 'ETag terbaru dari GET, contoh: "1"' });

@ApiTags('patients')
@Controller('patients')
export class PatientsController {
  constructor(private readonly service: PatientsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Daftar pasien dengan filter, sorting, dan pagination' })
  @ApiOkResponse({ type: PatientListResponseDto })
  @ApiProblem(400, 'Parameter query tidak valid')
  list(@Query() query: ListPatientsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @Header('Cache-Control', 'private, no-cache')
  @ApiOperation({ summary: 'Detail pasien beserta header ETag' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: Patient, description: 'Berhasil; header ETag berisi versi data' })
  @ApiResponse({ status: 304, description: 'Data tidak berubah (If-None-Match cocok)' })
  @ApiProblem(400, 'ID tidak valid')
  @ApiProblem(404, 'Pasien tidak ditemukan')
  async get(@Param('id', IdParamPipe) id: number, @Res({ passthrough: true }) res: Response) {
    const patient = await this.service.get(id);
    res.setHeader('ETag', toEtag(patient.version));
    return patient;
  }

  @Post()
  @ApiOperation({ summary: 'Mendaftarkan pasien baru' })
  @ApiCreatedResponse({ type: Patient })
  @ApiProblem(400, 'Validasi gagal atau JSON tidak valid')
  @ApiProblem(409, 'Nomor rekam medis atau NIK sudah terdaftar')
  async create(@Body() dto: CreatePatientDto, @Res({ passthrough: true }) res: Response) {
    const patient = await this.service.create(dto);
    res.setHeader('Location', `/api/v1/patients/${patient.id}`);
    res.setHeader('ETag', toEtag(patient.version));
    return patient;
  }

  @Put(':id')
  @IF_MATCH
  @ApiOperation({ summary: 'Mengganti seluruh data pasien' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: Patient })
  @ApiProblem(400, 'Validasi gagal')
  @ApiProblem(404, 'Pasien tidak ditemukan')
  @ApiProblem(409, 'Nomor rekam medis atau NIK dipakai pasien lain')
  @ApiProblem(412, 'ETag tidak cocok dengan versi terbaru')
  @ApiProblem(428, 'Header If-Match tidak dikirim')
  async replace(
    @Param('id', IdParamPipe) id: number,
    @Body() dto: CreatePatientDto,
    @Headers('if-match') ifMatch: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const patient = await this.service.replace(id, dto, ifMatch);
    res.setHeader('ETag', toEtag(patient.version));
    return patient;
  }

  @Patch(':id')
  @IF_MATCH
  @ApiOperation({ summary: 'Mengubah sebagian data pasien' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: Patient })
  @ApiProblem(400, 'Validasi gagal atau body kosong')
  @ApiProblem(404, 'Pasien tidak ditemukan')
  @ApiProblem(409, 'Nomor rekam medis atau NIK dipakai pasien lain')
  @ApiProblem(412, 'ETag tidak cocok dengan versi terbaru')
  @ApiProblem(428, 'Header If-Match tidak dikirim')
  async patch(
    @Param('id', IdParamPipe) id: number,
    @Body() dto: PatchPatientDto,
    @Headers('if-match') ifMatch: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const patient = await this.service.patch(id, dto, ifMatch);
    res.setHeader('ETag', toEtag(patient.version));
    return patient;
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Menghapus pasien tanpa riwayat janji temu' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNoContentResponse({ description: 'Berhasil dihapus' })
  @ApiProblem(400, 'ID tidak valid')
  @ApiProblem(404, 'Pasien tidak ditemukan')
  @ApiProblem(409, 'Pasien masih memiliki riwayat janji temu')
  remove(@Param('id', IdParamPipe) id: number) {
    return this.service.remove(id);
  }
}
