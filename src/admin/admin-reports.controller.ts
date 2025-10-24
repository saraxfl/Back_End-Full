import { Controller, Get, Put, Post, Param, ParseIntPipe, Body, BadRequestException, UseGuards, NotFoundException, InternalServerErrorException, Delete, HttpCode, Req, HttpException } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminReportsService } from "../reports/reports.service";
import { IsString /*, IsIn*/ } from 'class-validator';
import { IncidentList } from 'src/users/dto/incident-response.dto';

class SetStatusDto {   @IsString() status!: 'pendiente'|'aceptado'|'rechazado'; }
class SetPublishDto { published!: boolean; }


@ApiTags('Admin/reports')
@Controller('admin/reports') 
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminReportsController {
  constructor(private readonly svc: AdminReportsService) {}


@ApiOperation({ summary: 'Lista de incidentes (admin, solo asignados)' })
@Get('incidents')
async list(@Req() req) {
  const candidates = [
    req.user?.userId,
    req.user?.profile?.id,
    req.user?.raw?.sub,
  ];

  const raw = candidates.find(v => v !== undefined && v !== null);

  const adminId = Number.parseInt(String(raw), 10);

  if (!Number.isInteger(adminId) || adminId <= 0) {
    throw new BadRequestException('Admin ID inválido en el token.');
  }

  return this.svc.listForAdmin(adminId);
}


 /* @ApiOperation({ summary: 'Lista de incidentes ( admin)' })
  @Get('incidents')
  async list() {
    return this.svc.list();  
  } */


  @ApiOperation({ summary: 'Estatus reportes ( admin)' })
  @Put('incidents/:id/status')
  async setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetStatusDto,
  ) 
{  
    await this.svc.setStatus(id, dto.status);
    return { ok: true };
  }



  @ApiOperation({ summary: 'Publicar reportes ( admin)' })
  @Put('incidents/:id/publish')
  async setPublish(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetPublishDto,
  ) {
    await this.svc.setPublish(id, dto.published);
    return { ok: true };
  }

  @ApiOperation({ summary: 'Eliminar reporte ( admin)' })
  @Delete('incidents/:id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.svc.remove(id);
    return { ok: true };
  }



  @ApiOperation({ summary: 'Ver lista de incidentes (admin)' })
  @Get('incident')
async getIncidents(): Promise<IncidentList[]> {
  try {
    const data = await this.svc.listIncidents();
    if (!data?.length) throw new NotFoundException('No hay accidentes');
    return data;
  } catch (e) {
    if (e instanceof HttpException) throw e;

    throw new InternalServerErrorException('No es posible realizar la busqueda');
  }
}

//sara parte dos intento
  
  @ApiOperation({ summary: 'Actividad de incidentes por mes (global, sin año)' })
  @Get('incidents-by-month')
  async incidentsByMonth() {
    return this.svc.incidentsByMonth();
  }

  @ApiOperation({ summary: 'Casos por categoría (global)' })
  @Get('by-category')
  async byCategory() {
    return this.svc.byCategory();
  }

  @ApiOperation({ summary: 'Distribución por estado (global)' })
  @Get('by-status')
  async byStatus() {
    return this.svc.byStatus();
  }

  @ApiOperation({ summary: 'Publicados vs No publicados (global)' })
  @Get('publish-ratio')
  async publishRatio() {
    return this.svc.publishRatio();
  }



}