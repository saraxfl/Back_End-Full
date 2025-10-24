/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {IsEmail, IsNotEmpty, IsString, MaxLength, MinLength, Matches,} from 'class-validator';

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).+$/; 

export class CreateUserDto {
  @ApiProperty({
    example: 'juan@example.com',
    description: 'Correo del usuario',
    required: true,
  })

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Email inválido' })
  @MaxLength(255, { message: 'Email demasiado largo' })
  email!: string;


  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre para mostrar',
    required: true,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MinLength(2, { message: 'El nombre es muy corto' })
  @MaxLength(100, { message: 'El nombre es muy largo' })
  name!: string;

  
  @ApiProperty({
    example: 'Passw0rd123',
    description:
      'Contraseña del usuario. Mínimo 8 caracteres, con al menos una letra y un número.',
    required: true,
  })
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, {
    message: 'La contraseña no debe exceder 72 caracteres',
  })
  @Matches(PASSWORD_RULE, {
    message: 'La contraseña debe incluir al menos una letra y un número',
  })
  password!: string;
}
