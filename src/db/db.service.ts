/* eslint-disable prettier/prettier */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createPool, Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  onModuleInit(): void {
    this.pool = createPool({
      port: 3306,
      host: '127.0.0.1',
      user: 'root',
      password: 'Fn30Df19',        // ← considera mover esto a variables de entorno
      database: 'reto_final',           // ← ojo: cuida mayúsculas/minúsculas (ver nota abajo)
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      // dateStrings: true,           // (opcional) si quieres DATETIME como string
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
    return this.pool.query<T>(sql, params);
  }
}