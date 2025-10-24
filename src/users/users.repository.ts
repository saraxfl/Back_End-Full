/* eslint-disable prettier/prettier */

import { Injectable } from "@nestjs/common";
import { DbService } from "src/db/db.service";
import { UserResponseDto } from './dto/user-response.dto';
import { ResultSetHeader, RowDataPacket } from 'mysql2';



export type User = {
    id: number;
    email: string;
    name: string;
    is_admin: 0 | 1;
    password_hash: string;
    salt: string;
};


export type UserDTO = {
  email: string;
  name: string;
  hashed_password: string;
  salt: string;
  is_admin?: 0 | 1;      
};

export type UpdateUserInput = {
  email?: string; 
  name?: string; 
};

@Injectable()
export class UsersRepository{
    constructor(private readonly db: DbService) {}

    async createUser({ email, name, hashed_password, salt, is_admin = 0 }: UserDTO): Promise<void> { 
    const sql = `INSERT INTO users (email, name, password_hash, is_admin, salt)
      VALUES (?, ?, ?, ?, ?)`;
    const [res]: any = await this.db.getPool().execute(sql, [
      email,
      name,
      hashed_password,
      is_admin,
      salt,
    ]);
  }

    async createAdmin({ email, name, hashed_password, salt }: UserDTO): Promise<User> {
    const is_admin = 1;
    const sql = `
      INSERT INTO users (email, name, password_hash, is_admin, salt)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [res]: any = await this.db.getPool().execute(sql, [
      email,
      name,
      hashed_password,
      is_admin,
      salt,
    ]);

    return {
      id: res.insertId,
      email,
      name,
      is_admin,
      password_hash: hashed_password,
      salt,
    };
  }


    async deleteById(id: number): Promise<number> {
    const [res] = await this.db.getPool().execute<ResultSetHeader>(
      'DELETE FROM users WHERE id = ? AND is_admin = 0',
      [id],
    );
  
    return res.affectedRows ?? 0;
  }



    async findByEmail(email:string): Promise<User | null> {
        const sql = `SELECT * FROM users WHERE email = '${email}' LIMIT 1`;
        const [rows] = await this.db.getPool().query(sql);
        const result= rows as User[];
        return result[0] || null;
    }


    async findById(id: number): Promise<User | null> {
        const sql = `SELECT * FROM users WHERE id = ? LIMIT 1`;
        const [rows] = await this.db.getPool().query(sql, [id]);
        const result = rows as User[];
        return result[0] || null;
    }

    async findPublicProfile(id: number): Promise<{ name: string; email: string } | null> {
      const sql = `SELECT name, email FROM users WHERE id = ? LIMIT 1`;
      const [rows] = await this.db.getPool().query(sql, [id]);
      const result = rows as { name: string; email: string }[];
      return result[0] || null;
    }

    /*async findAll() {
        const sql = `SELECT * FROM users ORDER BY id DESC`;
        const [rows] = await this.db.getPool().query(sql);
        return rows as any[]; 
    } */
  
        async findAll(): Promise<UserResponseDto[]> {
  try {
    const sql = `SELECT id, email, is_admin, user_status FROM users ORDER BY id DESC`;

    // 👇 Le decimos explícitamente a TS que esperamos filas
    const [rows] = await this.db.getPool().query<RowDataPacket[]>(sql);

    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map((user) => ({
      id: user.id,
      email: user.email,
      is_admin: user.is_admin,
      user_status: user.user_status,
    }));
  } catch (error) {
    console.error(error);
    throw new Error('Error fetching users from the database');
  }
}



    async updateUser(id: number, data: UpdateUserInput): Promise<void> {
      const fields: string[] = [];
      const params: any[] = [];

      const exists = await this.findById(id);
      if (!exists) throw new Error(`User ${id} not found`);

      if (data.email !== undefined) {
        fields.push(`email = ?`);
        params.push(data.email);
      }

      if (data.name !== undefined) {
        fields.push(`name = ?`);
        params.push(data.name);
      }

      if (fields.length === 0) return;

      const sql = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
      params.push(id);

      await this.db.getPool().query(sql, params);


  }



}