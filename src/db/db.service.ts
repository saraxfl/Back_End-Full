/* eslint-disable prettier/prettier */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createPool, Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import 'dotenv/config';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  onModuleInit(): void {
    this.pool = createPool({
      port: Number(process.env.MYSQL_PORT) || 3306,
      host: process.env.MYSQL_HOST || '127.0.0.1',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'reto_final',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  onModuleDestroy() {
    return this.pool.end();
  }

  getPool(): Pool {
    return this.pool;
  }

  // ✅ IMPLEMENTADO: usa el pool real
  async execute<T extends RowDataPacket[] | ResultSetHeader>(
    sql: string,
    params: any[] = []
  ): Promise<[T, any]> {
    return this.pool.execute<T>(sql, params);
  }

  // (opcional) útil si usas query en algún repo
  async query<T extends RowDataPacket[] | RowDataPacket[][]>(
    sql: string,
    params: any[] = []
  ): Promise<[T, any]> {
    return this.pool.query<T>(sql, params);
  }
}
