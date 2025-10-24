/* eslint-disable prettier/prettier */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {IsEmail, IsOptional, IsString, MaxLength, MinLength, ValidateIf} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'nuevo@mail.com',
    nullable: true,
    description:
      'Nuevo correo del usuario. Puede ser null',
  })
  @Transform(({ value }) => {
    if (value === '') return undefined; 
    if (typeof value === 'string') return value.trim().toLowerCase();
    return value; 
  })


  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsEmail({}, { message: 'Email inválido' })
  @MaxLength(255, { message: 'Email demasiado largo' })
  email?: string | null;

  @ApiPropertyOptional({
    example: 'Nuevo Nombre',
    nullable: true,
    description:
      'Nombre para mostrar. Puede ser null',
  })

  @Transform(({ value }) => {
    if (value === '') return undefined; 
    if (typeof value === 'string') return value.trim().replace(/\s+/g, ' ');
    return value;
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString({ message: 'El nombre debe ser texto' })
  @MinLength(2, { message: 'El nombre es muy corto' })
  @MaxLength(100, { message: 'El nombre es muy largo' })
  name?: string | null;
}
