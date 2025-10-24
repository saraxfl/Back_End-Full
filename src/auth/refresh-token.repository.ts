import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { ResultSetHeader } from 'mysql2/promise';

export type RefreshTokenRow = {
  id: number;
  user_id: number;
  token_hash: string;
  user_agent: string | null;
  revoked_reason: string | null;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
};

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly db: DbService) {}

  async insert(params: {
    userId: number;
    tokenHash: string;
    userAgent?: string | null;
    expiresAt: Date;
  }): Promise<number> {
    const pool = this.db.getPool();
    const { userId, tokenHash, userAgent = null, expiresAt } = params;
    const [res]: any = await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, expires_at)
       VALUES (?, ?, ?, ?)`,
      [userId, tokenHash, userAgent, expiresAt],
    );
    return res.insertId as number;
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
    const pool = this.db.getPool();
    const [rows]: any = await pool.query(
      `SELECT * FROM refresh_tokens WHERE token_hash = ? LIMIT 1`,
      [tokenHash],
    );
    return rows[0] ?? null;
  }

  async revokeByHash(
    tokenHash: string,
    reason: 'ROTATED'|'USER_LOGOUT'|'ADMIN_FORCE_LOGOUT'|'COMPROMISED'|'USER_BANNED',
  ): Promise<void> {
    const pool = this.db.getPool();
    await pool.query(
      `UPDATE refresh_tokens
          SET revoked_at = NOW(), revoked_reason = ?
        WHERE token_hash = ? AND revoked_at IS NULL`,
      [reason, tokenHash],
    );
  }

  async revokeAllForUser(
    userId: number,
    reason: 'ADMIN_FORCE_LOGOUT'|'USER_BANNED'|'USER_LOGOUT',
  ): Promise<void> {
    const pool = this.db.getPool();
    await pool.query(
      `UPDATE refresh_tokens
          SET revoked_at = NOW(), revoked_reason = ?
        WHERE user_id = ? AND revoked_at IS NULL`,
      [reason, userId],
    );
  }

  async deleteExpired(): Promise<number> {
  const sql = `
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW()
  `;

  const pool = this.db.getPool();                       
  const [res] = await pool.query<ResultSetHeader>(sql); 

  return res.affectedRows ?? 0; 
}

  isUsable(row: RefreshTokenRow): boolean {
    const now = new Date();
    if (row.revoked_at) return false;
    if (row.expires_at <= now) return false;
    return true;
  }
}
