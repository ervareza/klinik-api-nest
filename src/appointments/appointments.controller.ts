import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { IdParamPipe } from '../common/id-param.pipe';
import { ApiProblem } from '../common/problem-details.dto';
import { Appointment } from './appointment.entity';
import { AppointmentsService } from './appointments.service';
import { AppointmentListResponseDto, CreateAppointmentDto, ListAppointmentsQueryDto, UpdateAppointmentStatusDto } from './dto/appointment.dto';

@ApiTags('appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Daftar janji temu dengan filter, sorting, dan pagination' })
  @ApiOkResponse({ type: AppointmentListResponseDto })
  @ApiProblem(400, 'Parameter query tidak valid')
  list(@Query() query: ListAppointmentsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Detail janji temu' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: Appointment })
  @ApiProblem(400, 'ID tidak valid')
  @ApiProblem(404, 'Janji temu tidak ditemukan')
  get(@Param('id', IdParamPipe) id: number) {
    return this.service.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Memesan janji temu (transaksi database)' })
  @ApiCreatedResponse({ type: Appointment })
  @ApiProblem(400, 'Validasi gagal atau tanggal di masa lalu')
  @ApiProblem(404, 'Pasien atau dokter tidak ditemukan')
  @ApiProblem(409, 'Kuota penuh, dokter nonaktif, atau pasien sudah memiliki janji aktif')
  async book(@Body() dto: CreateAppointmentDto, @Res({ passthrough: true }) res: Response) {
    const appointment = await this.service.book(dto);
    res.setHeader('Location', `/api/v1/appointments/${appointment.id}`);
    return appointment;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mengubah status janji temu' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: Appointment })
  @ApiProblem(400, 'Status tidak valid')
  @ApiProblem(404, 'Janji temu tidak ditemukan')
  @ApiProblem(409, 'Perubahan status tidak diperbolehkan')
  updateStatus(@Param('id', IdParamPipe) id: number, @Body() dto: UpdateAppointmentStatusDto) {
    return this.service.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Menghapus janji temu yang belum berjalan' })
  @ApiParam({ name: 'id', type: Number })
  @ApiNoContentResponse({ description: 'Berhasil dihapus' })
  @ApiProblem(400, 'ID tidak valid')
  @ApiProblem(404, 'Janji temu tidak ditemukan')
  @ApiProblem(409, 'Janji temu sudah berjalan atau selesai')
  remove(@Param('id', IdParamPipe) id: number) {
    return this.service.remove(id);
  }
}
