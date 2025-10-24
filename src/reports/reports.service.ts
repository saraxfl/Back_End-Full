// src/reports/reports.service.ts
import { Injectable, ForbiddenException, NotFoundException, ConflictException, BadRequestException} from '@nestjs/common';
import { ReportsRepository, IncidentDbRow} from './reports.repository';
import * as fs from 'fs/promises';
import { IncidentList } from "src/users/dto/incident-response.dto";


interface CreateReportInput {
  requesterUserId: number;
  page_url?: string;
  description?: string;
  anonymous: boolean;
  categoryId?: number; 
  files: { path: string; mimetype?: string; size?: number }[];
}

type UpdateMyReportInput = {
  page_url?: string;
  description?: string;
  categoryId?: number;
  addFile: { path: string; mimetype?: string; size?: number }[]; 
  deletePhoto: boolean;
};

export type AdminIncidentDto = {
  id: number;
  user_id: number | null;
  created: string;            // 'YYYY-MM-DD HH:mm:ss'
  url: string | null;
  photo_path: string | null;  // path de la foto (attachments)
  status: string;             // statuses.name
  published: 'Published' | 'Unpublished';
  description: string | null;
};


@Injectable()
export class AdminReportsService {
  constructor(private readonly repo: ReportsRepository) {}

  async listIncidents(): Promise<IncidentList[]> {
    return this.repo.listIncidents();
  }


  async listForAdmin(adminId: number): Promise<AdminIncidentDto[]> {
    const rows: IncidentDbRow[] =
      await this.repo.listIncidentsForAdminMinimal(adminId);

    return rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      created: r.created,
      url: r.url,
      photo_path: r.photo_path,
      status: r.status,
      published: r.published ? 'Published' : 'Unpublished',
      description: r.description,
    }));
  }

  /*async list(): Promise<AdminIncidentDto[]> {
    const rows: IncidentDbRow[] = await this.repo.listIncidentsForAdminMinimal();
    return rows.map(r => ({
      id: r.id,
      user_id: r.user_id,
      created: r.created,
      url: r.url,
      photo_path: r.photo_path,
      status: r.status,
      published: r.published ? 'Published' : 'Unpublished',
      description: r.description,
    }));
  }*/

  async setStatus(incidentId: number, statusInput: string): Promise<void> {
    if (!statusInput) throw new BadRequestException('status is required');
    const statusId = await this.repo.getStatusIdBySlugOrName(statusInput);
    if (!statusId) throw new BadRequestException(`Unknown status: ${statusInput}`);

    const ok = await this.repo.setIncidentStatus(incidentId, statusInput);
    if (!ok) throw new NotFoundException('Incident not found');
  }

  async setPublish(incidentId: number, published: boolean): Promise<void> {
    const ok = await this.repo.setIncidentPublish(incidentId);
    if (!ok) throw new NotFoundException('Incident not found');
  }

  /**
   * PUT /admin/reports/incidents/:id/admin { admin_id: number|null }
   * - Si `admin_id` es null => desasigna
   * - Si trae un número => valida que sea admin activo y asigna
   */
 
  async remove(incidentId: number): Promise<void> {
    const ok = await this.repo.hardDeleteIncident(incidentId);
    if (!ok) throw new NotFoundException('Incident not found');
  }

   //parte dos sara

   async incidentsByMonth() {
    return this.repo.withTransaction(async (cx) => {
      const rows = await this.repo.incidentsByMonth(cx);
      const data = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const r = rows.find(x => x.month === m);
        return r ? r.total : 0;
      });
      return {
        labels: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
        data
      };
    });
  }

  async byCategory() {
    return this.repo.withTransaction(async (cx) => {
      const rows = await this.repo.byCategory(cx);
      return {
        labels: rows.map(r => r.category),
        data: rows.map(r => r.total),
      };
    });
  }

  async byStatus() {
    return this.repo.withTransaction(async (cx) => {
      const rows = await this.repo.byStatus(cx);
      return {
        labels: rows.map(r => r.status),
        data: rows.map(r => r.total),
      };
    });
  }

  async publishRatio() {
    return this.repo.withTransaction(async (cx) => {
      const rows = await this.repo.publishRatio(cx);
      const published = rows.find(r => r.published === 1)?.total ?? 0;
      const not = rows.find(r => r.published === 0)?.total ?? 0;
      return {
        labels: ['Publicados', 'No publicados'],
        data: [published, not],
      };
    });
  }
 



}


@Injectable()
export class ReportsService {
  constructor(private readonly repo: ReportsRepository) {}

  
  async createReport(input: CreateReportInput) {
    const { requesterUserId, anonymous, page_url, description, categoryId, files } = input;

    if (!requesterUserId) {
      throw new ForbiddenException('Debes iniciar sesión para crear un reporte');
    }

    const cats: number[] = typeof categoryId === 'number' ? [categoryId] : [];

    const incidentId = await this.repo.withTransaction(async (cx) => {
      const id = await this.repo.insertIncident(cx, {
        ownerUserId: requesterUserId, 
        userId: anonymous ? null : requesterUserId,
        page_url,
        description,
        anonymous,
        status_id: 1,  
        assigned_admin_id: null,
        is_published: 0,
      });

      if (cats.length) {
        await this.repo.insertIncidentCategories(cx, id, cats);
      }

      if (files?.length) {
        await this.repo.insertAttachmentRows(cx, id, files);
      }

      const adminId = await this.repo.findLeastLoadedAdmin(cx);
      if (adminId) {
        await this.repo.assignAdminIfEmpty(cx, id, adminId);
      }
      return id;
    });

    return { id: incidentId };
  }


   async updateMyReport(userId: number, incidentId: number, input: UpdateMyReportInput): Promise<void> {
    const toUnlink: string[] = await this.repo.withTransaction(async (cx) => {
      const ok = await this.repo.updateOwnedIncident(cx, userId, incidentId, {
        page_url: input.page_url,
        description: input.description,
      });
      if (!ok) throw new ConflictException('El reporte ya no es editable');

      if (typeof input.categoryId === 'number') {
        await this.repo.setSingleCategory(cx, incidentId, input.categoryId);
      }

      const unlinkPaths: string[] = [];
      const current = await this.repo.getOwnedSingleAttachment(cx, userId, incidentId);
      const newFile = input.addFile?.[0];

      if (newFile) {
        if (current) {
          await this.repo.deleteOwnedAttachmentById(cx, userId, incidentId, current.id);
          unlinkPaths.push(current.path);
        }
        await this.repo.insertAttachmentRows(cx, incidentId, [newFile]);
      } else if (input.deletePhoto && current) {
        await this.repo.deleteOwnedAttachmentById(cx, userId, incidentId, current.id);
        unlinkPaths.push(current.path);
      }
      return unlinkPaths;
    });

    for (const p of toUnlink) {
      try { await fs.unlink(p); } catch {}
    }
    const exists = await this.repo.getOwnedDetail(userId, incidentId);
    if (!exists) throw new NotFoundException('Reporte no existe o no te pertenece');
    return;
  }


  async listMine(userId: number) {
    const rows = await this.repo.listByOwner(userId);
    return rows.map((r) => this.projectCompact(r));
  }


  async getMyReportDetail(userId: number, incidentId: number) {
    const r = await this.repo.getOwnedDetail(userId, incidentId);
  if (!r) throw new NotFoundException('Reporte no existe o no te pertenece');

  const atts = await this.repo.listAttachments(incidentId);
  return this.projectFrontDetail(r, atts);
  }


  async deleteMyReport(userId: number, incidentId: number) {
    await this.repo.withTransaction(async (cx) => {
      const row = await this.repo.getOwnedIncidentForUpdate(cx, userId, incidentId);
      if (!row) throw new NotFoundException('Reporte no existe o no te pertenece');

      const ok = await this.repo.softDeleteIncident(cx, userId, incidentId);
      if (!ok) throw new ConflictException('No se pudo eliminar el reporte');
    });

    return;
  }


  private projectCompact(r: any) {
    return {
      id: r.id,
      status: r.status,
      description: r.description,
      created_at: r.created_at,
      category: r.category ?? null,
    };
  }

  private projectReportDetail(r: any) {
    const canEdit = r.status_id === 1 && !r.is_published;
    return {
      page_url: r.page_url,
      description: r.description,
      anonymous: !!r.anonymous,
      status: r.status_name,
      is_published: !!r.is_published,
      created_at: r.created_at,
      category_name: r.category_name ?? null,
      attachments_count: Number(r.attachments_count) || 0,
      canEdit,
      canAttach: canEdit,
    };
  }

  private serializeIncident(row: any) {
    return {
      id: row.id,
      owner_user_id: row.owner_user_id,
      user_id: row.user_id,
      page_url: row.page_url,
      domain: row.domain,
      description: row.description,
      anonymous: !!row.anonymous,
      status_id: row.status_id,
      status: row.status_name,
      assigned_admin_id: row.assigned_admin_id,
      is_published: !!row.is_published,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private serializeAttachment = (a: any) => ({
    id: a.id,
    incident_id: a.incident_id,
    path: a.path,
    url: `/${a.path.replace(/^public\//, 'public/')}`,
    mime_type: a.mime_type,
    size_bytes: a.size_bytes,
    created_at: a.created_at,
  });

  private pickCoverUrl = (attachments: any[]) => {
  const cover = attachments.find(a => /^image\//.test(String(a?.mime_type ?? '')))
             || attachments[0]
             || null;
  return cover ? this.serializeAttachment(cover).url : null;
  };

  private projectFrontDetail(r: any, attachments: any[]) {
  return {
    page_url: r.page_url ?? null,
    description: r.description ?? null,
    anonymous: !!r.anonymous,
    category: r.category_name ?? null,
    image: this.pickCoverUrl(attachments),
  };
  }


}
