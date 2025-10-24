/* eslint-disable prettier/prettier */

import { Injectable, NotFoundException, BadRequestException,ConflictException } from "@nestjs/common";
import { UsersRepository } from "./users.repository";
import { createHmac, randomBytes } from 'crypto';
import { UserResponseDto } from 'src/users/dto/user-response.dto'; 


function sha256WithSalt(password: string, salt: string) {
  return createHmac('sha256', Buffer.from(salt, 'utf8'))
    .update(password, 'utf8')
    .digest('hex');
}


type UpdatePatch = { email?: string | null; name?: string | null };

@Injectable()
export class UserService {
    constructor(private readonly usersRepository: UsersRepository) {}

    async createUser(email: string, name: string, password: string) {
        console.log("Aqui cifraremos la contraseña");
        const salt = randomBytes(32).toString('hex');
        const hashed_password = sha256WithSalt(password, salt);
        return this.usersRepository.createUser({email, name, hashed_password, salt});
    }

    async createAdmin(email: string, name: string, password: string) {
        const salt = randomBytes(32).toString('hex');
        const hashed_password = sha256WithSalt(password, salt);
        return this.usersRepository.createAdmin({ email, name, hashed_password, salt });
    }

    async deleteUser(id: number): Promise<void> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('El id debe ser un entero positivo.');
    }
    const affected = await this.usersRepository.deleteById(id);
    if (affected === 0) {
      throw new NotFoundException(`No se encontró el usuario con id o es un admin`);
    }
  }

    async findById(id: number) {
        const user = await this.usersRepository.findById(id);
        if (!user) throw new NotFoundException(`User ${id} not found`);
        const { password_hash, salt, ...safeUser } = user;
        return safeUser;
    }

    

    async findPublicProfile(id: number): Promise<{ name: string; email: string }> {
        const user = await this.usersRepository.findPublicProfile(id);
        if (!user) throw new NotFoundException(`User ${id} not found`);
        return user;
    }

    async findAll(): Promise<UserResponseDto[]> {
    try {
      const users = await this.usersRepository.findAll();

      if (!users || users.length === 0) {
        throw new Error('No users found');
      }

      return users;
    } catch (error) {
      throw new Error('Unable to fetch users');
    }
}

   /* async findAll() {
        const rows = await this.usersRepository.findAll();
        return rows.map(({ password_hash, salt, ...safe }) => safe);
    }*/

    async validateUser(email:string, password:string){
        const user = await this.usersRepository.findByEmail(email);
        if (!user) {
            return null;
        }

        const hashed = sha256WithSalt(password, user.salt);

        console.log(user);
        console.log("Password ingresada:", password);
        console.log("Salt de DB:", user.salt);
        console.log("Hash guardado:", user.password_hash);
        console.log("Hash calculado:", hashed);

        const isValid = user.password_hash === hashed;
        return isValid ? user : null;
    }

    async updateById(id: number, patch: UpdatePatch): Promise<void> {
    if (!patch || (patch.email == null && patch.name == null)) {
        throw new BadRequestException("Nada que actualizar");
    }

    const current = await this.usersRepository.findById(id);
    if (!current) throw new NotFoundException(`User ${id} not found`);

    if (patch.email && patch.email !== current.email) {
        const clash = await this.usersRepository.findByEmail(patch.email);
        if (clash && clash.id !== id) {
            throw new ConflictException("Email ya está en uso");
      }
    }

    await this.usersRepository.updateUser(id, {
        email: patch.email ?? undefined,
        name: patch.name ?? undefined,
    });

    }
 
  
}

