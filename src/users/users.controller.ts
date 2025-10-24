/* eslint-disable prettier/prettier */

import { Body, Controller, Post, Get, Param, ParseIntPipe, Req, Put, Headers, UnauthorizedException, BadRequestException, UseGuards } from "@nestjs/common";
import { UserService } from "./users.service";
import { ApiOperation, ApiTags} from "@nestjs/swagger";
import { TokenService } from "src/auth/token.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";

@ApiTags('Modulo de Usuarios')
@Controller('users')
export class UsersController {
    constructor(
        private readonly userService: UserService,
        private readonly tokenService: TokenService,
    ) {}

    @ApiOperation({summary: "Endpoint de registro de usuarios"})
    @Post()
    async createUser(@Body() createUserDto: CreateUserDto) {
        return this.userService.createUser(
            createUserDto.email,
            createUserDto.name,
            createUserDto.password,
        );
    }

    @ApiOperation({ summary: "Endpoint para lista de usuarios" })
    @Get('list')
    getAll() {
        return this.userService.findAll();
    }
    
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: "Endpoint para encontrar usuario" })
    @Get('me')
    async getProfile(@Req() req: Request & {user?: any}) {
      const userId: number = req.user!.userId;
        return this.userService.findPublicProfile(userId);
    }

    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: "Modificar usuario usando Access Token" })
    @Put('modify')
    async updateMe(@Body() dto: UpdateUserDto, @Req() req: Request & {user?: any}) {
      if (!dto || (dto.email == null && dto.name == null)) {
        throw new BadRequestException("Nada que actualizar");
      }
      const userId: number = req.user!.userId;
        return this.userService.updateById(userId, { email: dto.email ?? undefined, name: dto.name ?? undefined });
  }

}