import { Injectable } from '@nestjs/common';
import { DbService } from "src/db/db.service";
import { PoolConnection, ResultSetHeader, RowDataPacket  } from 'mysql2/promise';
import { IncidentList } from "src/users/dto/incident-response.dto";

type MonthRow   = { month: number; total: number };
type CategoryRow= { category: string; total: number };
type StatusRow  = { status: string; total: number };
type PublishRow = { published: 0 | 1; total: number };

export interface AttachmentRow {
  id: number;
  incident_id: number;
  path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

type PublicSearchInput = {
  categoryId?: number;
  domain?: string;
  limit: number;
  offset: number;
  order: 'newest' | 'oldest';
};

type TopDomainsInput = {
  windowDays: number;
  limit: number;
  offset: number;
};

type PublicFeedInput = {
  order: 'newest' | 'random';
  limit: number;
  offset: number;
  windowDays: number;
};

export type IncidentDbRow = RowDataPacket & {
  id: number;
  user_id: number | null;
  owner_user_id: number | null;
  assigned_admin_id: number | null;
  created: string;                 // YYYY-MM-DD HH:mm:ss
  url: string | null;              // page_url
  evidence_url: string | null;     
  anonymous: 0 | 1;
  status_name: string;             
  status_slug: string;             
  is_published: 0 | 1;
  description: string | null;
};



@Injectable()
export class ReportsRepository {
  constructor(private readonly db: DbService) {}

  async withTransaction<T>(fn: (cx: PoolConnection) => Promise<T>): Promise<T> {
    const pool = this.db.getPool();
    const cx = await pool.getConnection();
    try {
      await cx.beginTransaction();
      const result = await fn(cx);
      await cx.commit();
      return result;
    } catch (err) {
      await cx.rollback();
      throw err;
    } finally {
      cx.release();
    }
  }

  async insertIncident(cx: PoolConnection,
    {
      ownerUserId,     
      userId,
      page_url,
      description,
      anonymous,
      status_id = 1,
      assigned_admin_id = null,
      is_published = 0,
    }: {
      ownerUserId: number; 
      userId: number | null;
      page_url?: string;
      description?: string;
      anonymous: boolean;
      status_id?: number;
      assigned_admin_id?: number | null;
      is_published?: 0 | 1;
    },
  ): Promise<number> {
    const [res] = await cx.execute<ResultSetHeader>(
      `
      INSERT INTO incidents
      (owner_user_id, user_id, page_url, description, anonymous, status_id, assigned_admin_id, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [ownerUserId, userId, page_url ?? null, description ?? null, anonymous ? 1 : 0, status_id, assigned_admin_id, is_published],
    );
    return res.insertId;
  }

  
  async insertIncidentCategories(cx: PoolConnection, incidentId: number, categoryIds: number[],
  ): Promise<void> {
    if (!categoryIds?.length) return;
    const values = categoryIds.map((cid) => `(${incidentId}, ${Number(cid)})`).join(',');
    await cx.query(`INSERT IGNORE INTO incident_categories (incident_id, category_id) VALUES ${values}`);
  }

  async insertAttachmentRows(cx: PoolConnection, incidentId: number, files: { path: string; mimetype?: string; size?: number }[],
  ): Promise<AttachmentRow[]> {
    if (!files?.length) return [];

    const rows = files.map((f) => [incidentId, f.path, f.mimetype ?? null, f.size ?? null]);
    await cx.query(
      `INSERT INTO attachments (incident_id, path, mime_type, size_bytes) VALUES ?`,
      [rows],
    );

    const [created] = await cx.query(
      `SELECT id, incident_id, path, mime_type, size_bytes, created_at
       FROM attachments
       WHERE incident_id = ?
       ORDER BY id DESC
       LIMIT ?`,
      [incidentId, files.length],
    );
    return created as AttachmentRow[];
  }

  async findIncidentById(id: number) {
    const pool = this.db.getPool();
    const [rows] = await pool.query(
      `SELECT i.*, s.name AS status_name
       FROM incidents i
       JOIN statuses s ON s.id = i.status_id
       WHERE i.id = ?`,
      [id],
    );
    return (rows as any[])[0] ?? null;
  }

  async listAttachments(incidentId: number): Promise<AttachmentRow[]> {
    const pool = this.db.getPool();
    const [rows] = await pool.query(
      `SELECT id, incident_id, path, mime_type, size_bytes, created_at
       FROM attachments
       WHERE incident_id = ?
       ORDER BY id ASC`,
      [incidentId],
    );
    return rows as AttachmentRow[];
  }

async findLeastLoadedAdmin(cx: PoolConnection): Promise<number | null> {
  const [rows] = await cx.query(
    `
    SELECT u.id
    FROM users u
    WHERE u.is_admin = 1 AND u.user_status = 'active'
    ORDER BY (
      SELECT COUNT(*) FROM incidents i
      WHERE i.assigned_admin_id = u.id AND i.status_id = 1  -- pending
    ) ASC, u.id ASC
    LIMIT 1
    `
  );
  const row = (rows as any[])[0];
  return row ? Number(row.id) : null;
}

async assignAdminIfEmpty(cx: PoolConnection, incidentId: number, adminId: number): Promise<boolean> {
  const [res] = await cx.execute<ResultSetHeader>(
    `UPDATE incidents SET assigned_admin_id = ? WHERE id = ? AND assigned_admin_id IS NULL`,
    [adminId, incidentId],
  );
  return res.affectedRows === 1;
}

async listByOwner(ownerUserId: number) {
  const pool = this.db.getPool();
  const [rows] = await pool.query(
    `
    SELECT
      i.id,
      i.created_at,
      s.name AS status,
      i.description,
      (
        SELECT c.name
          FROM incident_categories ic
          JOIN categories c ON c.id = ic.category_id
         WHERE ic.incident_id = i.id
         LIMIT 1
      ) AS category
    FROM incidents i
    JOIN statuses s ON s.id = i.status_id
    WHERE i.owner_user_id = ?
      AND i.status_id <> 4
    ORDER BY i.created_at DESC
    `,
    [ownerUserId],
  );
  return rows as any[];
}


  async getOwnedDetail(ownerUserId: number, incidentId: number) {
  const pool = this.db.getPool();
  const [rows] = await pool.query(
    `
    SELECT
      i.id,
      i.page_url,
      i.description,
      i.anonymous,
      i.is_published,
      i.status_id,
      s.name AS status_name,
      (
        SELECT c.name
          FROM incident_categories ic
          JOIN categories c ON c.id = ic.category_id
         WHERE ic.incident_id = i.id
         LIMIT 1
      ) AS category_name,
      (
        SELECT COUNT(*) FROM attachments a WHERE a.incident_id = i.id
      ) AS attachments_count
    FROM incidents i
    JOIN statuses s ON s.id = i.status_id
    WHERE i.id = ?
      AND i.owner_user_id = ?
      AND i.status_id <> 4  
    LIMIT 1
    `,
    [incidentId, ownerUserId],
  );
  return (rows as any[])[0] ?? null;
  }

  async updateOwnedIncident(cx: PoolConnection, ownerId: number, incidentId: number, fields: { page_url?: string; description?: string },
  ): Promise<boolean> {
    const sets: string[] = [];
    const args: any[] = [];

    if (fields.page_url !== undefined) { sets.push('page_url = ?'); args.push(fields.page_url ?? null); }
    if (fields.description !== undefined) { sets.push('description = ?'); args.push(fields.description ?? null); }
    if (!sets.length) return true;

    args.push(incidentId, ownerId);
    const [res] = await cx.execute<ResultSetHeader>(
      `UPDATE incidents
          SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND owner_user_id = ?
          AND status_id = 1
          AND is_published = 0`,
      args,
    );
    return (res as ResultSetHeader).affectedRows === 1;
  }

  async setSingleCategory(cx: PoolConnection, incidentId: number, categoryId: number) {
    await cx.execute(`DELETE FROM incident_categories WHERE incident_id = ?`, [incidentId]);
    await cx.execute(
      `INSERT INTO incident_categories (incident_id, category_id) VALUES (?, ?)`,
      [incidentId, categoryId],
    );
  }

   async getOwnedSingleAttachment(cx: PoolConnection, ownerId: number, incidentId: number) {
    const [rows] = await cx.query(
      `
      SELECT a.id, a.path, a.mime_type, a.size_bytes
        FROM attachments a
        JOIN incidents i ON i.id = a.incident_id
       WHERE a.incident_id = ?
         AND i.owner_user_id = ?
         AND i.status_id = 1
         AND i.is_published = 0
       ORDER BY a.id DESC
       LIMIT 1
      `,
      [incidentId, ownerId],
    );
    return (rows as any[])[0] ?? null;
  }


  async getOwnedIncidentForUpdate(cx: PoolConnection, ownerId: number, incidentId: number) {
    const [rows] = await cx.query(
      `
      SELECT i.id
        FROM incidents i
       WHERE i.id = ? AND i.owner_user_id = ?
       FOR UPDATE
      `,
      [incidentId, ownerId],
    );
    return (rows as any[])[0] ?? null;
  }


  async listAttachmentPathsForIncident(cx: PoolConnection, incidentId: number): Promise<string[]> {
    const [rows] = await cx.query(
      `SELECT path FROM attachments WHERE incident_id = ?`,
      [incidentId],
    );
    return (rows as any[]).map(r => r.path);
  }


  async deleteOwnedAttachmentById(cx: PoolConnection, ownerId: number, incidentId: number, attId: number) {
    const [res] = await cx.execute<ResultSetHeader>(
      `
      DELETE a FROM attachments a
      JOIN incidents i ON i.id = a.incident_id
      WHERE a.id = ?
        AND a.incident_id = ?
        AND i.owner_user_id = ?
        AND i.status_id = 1
        AND i.is_published = 0
      `,
      [attId, incidentId, ownerId],
    );
    return (res as ResultSetHeader).affectedRows === 1;
  }


  async softDeleteIncident(cx: PoolConnection, ownerId: number, incidentId: number): Promise<boolean> {
  const [res] = await cx.execute<ResultSetHeader>(
    `UPDATE incidents
       SET status_id = 4,
           is_published = 0,
           updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND owner_user_id = ?`,
    [incidentId, ownerId],
  );
  return (res as ResultSetHeader).affectedRows === 1;
}

  async searchPublic(input: PublicSearchInput) {
    const pool = this.db.getPool();
    const where: string[] = [];
    const args: any[] = [];

    where.push('i.is_published = 1');
    where.push('i.status_id = 2');

    if (typeof input.categoryId === 'number') {
      where.push(`EXISTS (
        SELECT 1 FROM incident_categories ic
        WHERE ic.incident_id = i.id AND ic.category_id = ?
      )`);
      args.push(input.categoryId);
    }

    if (input.domain) {
      where.push('(LOWER(i.domain) = ? OR LOWER(i.domain) = CONCAT("www.", ?))');
      args.push(input.domain, input.domain);
    }

    const orderBy = input.order === 'oldest' ? 'i.created_at ASC' : 'i.created_at DESC';

    const sql = `
      SELECT
        i.id,
        i.page_url,
        i.description,
        i.anonymous,
        i.created_at,
        CASE WHEN i.anonymous = 1 OR u.name IS NULL THEN 'Anonymous' ELSE u.name END AS reporter_name,
        (SELECT c.name
           FROM incident_categories ic
           JOIN categories c ON c.id = ic.category_id
          WHERE ic.incident_id = i.id
          LIMIT 1) AS category_name,
        (SELECT a.path
           FROM attachments a
          WHERE a.incident_id = i.id
            AND (a.mime_type LIKE 'image/%' OR a.mime_type IS NULL)
          ORDER BY a.id ASC
          LIMIT 1) AS cover_path,
        s.name AS status_name
      FROM incidents i
      JOIN statuses s ON s.id = i.status_id
      LEFT JOIN users u ON u.id = i.user_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
    args.push(input.limit, input.offset);

    const [rows] = await pool.query(sql, args);
    return rows as any[];
  }


async getTopDomainsPublic(input: TopDomainsInput) {
  const pool = this.db.getPool();
  const sql = `
    WITH fi AS (
      SELECT
        i.id,
        REPLACE(LOWER(i.domain), 'www.', '') AS domain_norm
      FROM incidents i
      WHERE i.is_published = 1
        AND i.status_id = 2
        AND i.domain IS NOT NULL
        AND i.created_at >= NOW() - INTERVAL ? DAY
    ),
    domain_counts AS (
      SELECT domain_norm AS domain, COUNT(*) AS reports
      FROM fi
      GROUP BY domain_norm
    ),
    cat_counts AS (
      SELECT
        fi.domain_norm AS domain,
        ic.category_id,
        COUNT(*) AS cnt
      FROM fi
      JOIN incident_categories ic ON ic.incident_id = fi.id
      GROUP BY fi.domain_norm, ic.category_id
    ),
    top_cat AS (
      SELECT
        domain,
        category_id,
        cnt,
        ROW_NUMBER() OVER (PARTITION BY domain ORDER BY cnt DESC, category_id ASC) AS rn
      FROM cat_counts
    ),
    ranked AS (
      SELECT
        d.domain,
        d.reports,
        tc.category_id AS top_category_id
      FROM domain_counts d
      LEFT JOIN top_cat tc
        ON tc.domain = d.domain AND tc.rn = 1
      ORDER BY d.reports DESC
      LIMIT ? OFFSET ?
    )
    SELECT
      r.domain,
      r.reports,
      r.top_category_id,
      c.name AS top_category_name,
      (
        SELECT MAX(i2.created_at)
        FROM incidents i2
        WHERE i2.is_published = 1
          AND i2.status_id = 2
          AND i2.domain IS NOT NULL
          AND REPLACE(LOWER(i2.domain), 'www.', '') = r.domain
      ) AS last_report_at,
      (
        SELECT a.path
        FROM attachments a
        JOIN incidents i3 ON i3.id = a.incident_id
        WHERE i3.is_published = 1
          AND i3.status_id = 2
          AND i3.domain IS NOT NULL
          AND REPLACE(LOWER(i3.domain), 'www.', '') = r.domain
        ORDER BY a.id ASC
        LIMIT 1
      ) AS cover_path,
      (
        SELECT i4.page_url
        FROM incidents i4
        WHERE i4.is_published = 1
          AND i4.status_id = 2
          AND i4.domain IS NOT NULL
          AND REPLACE(LOWER(i4.domain), 'www.', '') = r.domain
        ORDER BY i4.created_at DESC
        LIMIT 1
      ) AS page_url
    FROM ranked r
    LEFT JOIN categories c ON c.id = r.top_category_id
  `;

  const args = [input.windowDays, input.limit, input.offset];
  const [rows] = await pool.query(sql, args);
  return rows as any[];
}

  async listPublicFeed(input: PublicFeedInput) {
    const pool = this.db.getPool();

    const baseSelect = `
      SELECT
        i.id,
        i.page_url,
        i.description,
        i.created_at,
        CASE
          WHEN i.anonymous = 1 OR u.name IS NULL THEN 'Anonymous'
          ELSE u.name
        END AS reporter_name,
        (SELECT c.name
           FROM incident_categories ic
           JOIN categories c ON c.id = ic.category_id
          WHERE ic.incident_id = i.id
          LIMIT 1) AS category_name,
        (SELECT a.path
           FROM attachments a
          WHERE a.incident_id = i.id
            AND (a.mime_type LIKE 'image/%' OR a.mime_type IS NULL)
          ORDER BY a.id ASC
          LIMIT 1) AS cover_path
      FROM incidents i
      JOIN statuses s ON s.id = i.status_id
      LEFT JOIN users u ON u.id = i.user_id
      WHERE i.is_published = 1
        AND i.status_id = 2
    `;

    if (input.order === 'random') {
      const sql = `
        ${baseSelect}
          AND i.created_at >= NOW() - INTERVAL ? DAY
        ORDER BY RAND()
        LIMIT ?
      `;
      const [rows] = await pool.query(sql, [input.windowDays, input.limit]);
      return rows as any[];
    } else {
      const sql = `
        ${baseSelect}
        ORDER BY i.created_at DESC
        LIMIT ? OFFSET ?
      `;
      const [rows] = await pool.query(sql, [input.limit, input.offset]);
      return rows as any[];
    }
  }

  async getStatusIdBySlugOrName(input: string): Promise<number | null> {
    const pool = this.db.getPool();
    const value = (input ?? '').trim();
  
    const [rows] = await pool.execute<any[]>(
      `SELECT id
         FROM statuses
        WHERE LOWER(name) = LOWER(?)
        LIMIT 1`,
      [value]
    );
  
    return rows.length ? rows[0].id : null;
  }
  
  
  /*ync listIncidentsForAdminMinimal(): Promise<IncidentDbRow[]> {
    const pool = this.db.getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        i.id,  
        i.user_id,
        DATE_FORMAT(i.created_at, '%Y-%m-%d %H:%i:%s') AS created,
        i.page_url AS url,
        (
          SELECT a.path
          FROM attachments a
          WHERE a.incident_id = i.id
            AND (a.mime_type LIKE 'image/%' OR a.mime_type IS NULL)
          ORDER BY a.id ASC
          LIMIT 1
        ) AS photo_path,
        s.name AS status,
        i.is_published AS published,
        i.description
      FROM incidents i
      JOIN statuses s ON s.id = i.status_id
      ORDER BY i.id DESC
      `
    );
    return rows as unknown as IncidentDbRow[];
  } */
  
  
      async listIncidentsForAdminMinimal(adminId: number): Promise<IncidentDbRow[]> {
      const pool = this.db.getPool();
      const [rows] = await pool.query<RowDataPacket[]>(
        `
        SELECT
          i.id,
          i.user_id,
          DATE_FORMAT(i.created_at, '%Y-%m-%d %H:%i:%s') AS created,
          i.page_url AS url,
          (
            SELECT a.path
            FROM attachments a
            WHERE a.incident_id = i.id
              AND (a.mime_type LIKE 'image/%' OR a.mime_type IS NULL)
            ORDER BY a.id ASC
            LIMIT 1
          ) AS photo_path,
          s.name AS status,
          i.is_published AS published,
          i.description
        FROM incidents i
        JOIN statuses s ON s.id = i.status_id
        WHERE i.assigned_admin_id = ?
        ORDER BY i.id DESC
        `,
        [adminId],
      );
  
      return rows as unknown as IncidentDbRow[];
    }
  
  async setIncidentStatus(incidentId: number, statusInput: string): Promise<boolean> {
    const statusId = await this.getStatusIdBySlugOrName(statusInput);
    if (!statusId) return false;
    const pool = this.db.getPool();
    const [res] = await pool.execute<ResultSetHeader>(
      `UPDATE incidents SET status_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [statusId, incidentId]
    );
    return res.affectedRows > 0;
  }
  

  async setIncidentPublish(incidentId: number): Promise<boolean> {
  const pool = this.db.getPool();
  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE incidents SET is_published = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [incidentId]
  );
  return res.affectedRows > 0;
}

  
  async hardDeleteIncident(incidentId: number): Promise<boolean> {
    const pool = this.db.getPool();
    const [res] = await pool.execute<ResultSetHeader>(
      `DELETE FROM incidents WHERE id = ?`,
      [incidentId]
    );
    return res.affectedRows > 0;
  }
  async listIncidents(): Promise<IncidentList[]> {
      const [rows] = await this.db.execute(
        `
        SELECT 
          i.id,
          i.user_id,
          DATE_FORMAT(i.created_at, '%Y-%m-%d %H:%i:%s') AS created,
          i.page_url AS url,
          IF(i.anonymous, 'Yes', 'No') AS anonymous,
          i.assigned_admin_id AS admin_id,
          s.name AS status,
          IF(i.is_published, 'Published', 'Unpublished') AS published,
          i.description
        FROM incidents i
        LEFT JOIN statuses s ON s.id = i.status_id
        ORDER BY i.created_at DESC`      );
  
      return rows as IncidentList[];
  
    }
  
  
    //sara parte dos intento
  
  /** Incidentes por mes (global, sin filtro de año) */
    async incidentsByMonth(cx: PoolConnection): Promise<MonthRow[]> {
      const [rows] = await cx.query<RowDataPacket[]>(
        `
        SELECT
          MONTH(i.created_at) AS month,
          COUNT(*)            AS total
        FROM incidents i
        GROUP BY MONTH(i.created_at)
        ORDER BY month ASC
        `
      );
      return rows as unknown as MonthRow[];
    }
  
    /** Casos por categoría (global). Si falta categoría -> 'Otros' */
    async byCategory(cx: PoolConnection): Promise<CategoryRow[]> {
      const [rows] = await cx.query<RowDataPacket[]>(
        `
        SELECT
          COALESCE(c.name, 'Otros') AS category,
          COUNT(*)                  AS total
        FROM incidents i
        LEFT JOIN incident_categories ic ON ic.incident_id = i.id
        LEFT JOIN categories c ON c.id = ic.category_id
        GROUP BY category
        ORDER BY total DESC, category ASC
        `
      );
      return rows as unknown as CategoryRow[];
    }
  
    /** Conteo por estado (global) */
    async byStatus(cx: PoolConnection): Promise<StatusRow[]> {
      const [rows] = await cx.query<RowDataPacket[]>(
        `
        SELECT
          COALESCE(s.name, 'unknown') AS status,
          COUNT(*)                    AS total
        FROM incidents i
        LEFT JOIN statuses s ON s.id = i.status_id
        GROUP BY status
        ORDER BY total DESC, status ASC
        `
      );
      return rows as unknown as StatusRow[];
    }
  
    /** Publicados vs no publicados (global) */
    async publishRatio(cx: PoolConnection): Promise<PublishRow[]> {
      const [rows] = await cx.query<RowDataPacket[]>(
        `
        SELECT
          i.is_published AS published,
          COUNT(*)       AS total
        FROM incidents i
        GROUP BY i.is_published
        ORDER BY published DESC
        `
      );
      return rows as unknown as PublishRow[];
    }
     
  




}




