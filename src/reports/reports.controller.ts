import {Controller, Post, Patch, Delete, Get, UseGuards, Param, UseInterceptors, UploadedFiles, Body, Req, ParseIntPipe, HttpCode} from '@nestjs/common';
import { FilesInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Request } from 'express';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { v4 as uuid } from 'uuid';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

function fileName(_, file, cb) {
  const unique = `${Date.now()}-${uuid()}`;
  cb(null, `${unique}${extname(file.originalname)}`);
}

function fileFilter(_, file, cb) {
  const ok =
    /^image\//.test(file.mimetype) ||
    file.mimetype === 'application/pdf';
  cb(ok ? null : new Error('Tipo de archivo no permitido'), ok);
}

function toBool(v: any): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['true','1','yes','on'].includes(s)) return true;
    if (['false','0','no','off',''].includes(s)) return false;
  }
  return Boolean(v);
}

function imageOnlyFilter(_, file, cb) {
  const ok = /^image\//.test(file.mimetype);
  cb(ok ? null : new Error('Sólo se permiten imágenes'), ok);
}

ApiTags("Modulo de reportes")
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

@ApiOperation({summary: "Crear reportes"})
@Post()
@UseInterceptors(
    FilesInterceptor('files', 8, {
        storage: diskStorage({
            destination: 'public/uploads',
            filename: fileName,
        }),
        fileFilter,
        limits: { fileSize: 8 * 1024 * 1024 },
    }),
)
async create(
    @Body() dto: CreateReportDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request & { user?: any },
) {
    const requesterUserId: number = req.user!.userId;

    const mappedFiles = (files ?? []).map((f) => ({
        path: `public/uploads/${f.filename}`,
        mimetype: f.mimetype,
        size: f.size,
}));

return this.reports.createReport({
    requesterUserId,
    page_url: dto.page_url,
    description: dto.description,
    anonymous: toBool(dto.anonymous),  
    categoryId: dto.categoryId,  
    files: mappedFiles,
});
}


@ApiOperation({summary: "Ver lista de reportes"})
  @Get()
  async list(@Req() req: Request & { user?: any }) {
    const userId: number = req.user!.userId;
      return this.reports.listMine(userId);
  }


@ApiOperation({summary: "Ver reporte por id, todos menos si esta eliminado"})
  @Get(':id')
  async getMyDetail(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user?: any },
  ) {
    const userId: number = req.user!.userId;
    return this.reports.getMyReportDetail(userId, id);
  }


@ApiOperation({summary: "Actualizar reporte mientras no este publicado"})
  @Patch(':id')
  @HttpCode(204)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file',  maxCount: 1 },
        { name: 'files', maxCount: 1 },
      ],
      {
        storage: diskStorage({ destination: 'public/uploads', filename: fileName }),
        fileFilter: imageOnlyFilter,
        limits: { fileSize: 8 * 1024 * 1024 },
      },
    ),
  )
  async updateMyReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportDto,
    @UploadedFiles() files: { file?: Express.Multer.File[]; files?: Express.Multer.File[] },
    @Req() req: Request & { user?: any },
  ): Promise <void> {

    const userId = req.user!.userId;

    const single =
      (files?.file && files.file[0]) ||
      (files?.files && files.files[0]) ||
      undefined;

    const addFile = single
      ? [{ path: `public/uploads/${single.filename}`, mimetype: single.mimetype, size: single.size }]
      : [];

  
    await this.reports.updateMyReport(userId, id, {
      page_url: dto.page_url,
      description: dto.description,
      categoryId: dto.categoryId,
      addFile,
      deletePhoto: !!dto.deletePhoto,
    });
  }


@ApiOperation({summary: "Eliminar el reporte (borrado logico)"})
  @Delete(':id')
  @HttpCode(204)
  async deleteMyReport(@Param('id', ParseIntPipe) id: number, 
  @Req() req: Request & { user?: any }) {
    const userId = req.user!.userId;
    await this.reports.deleteMyReport(userId, id);
}

}