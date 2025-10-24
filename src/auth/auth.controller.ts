/* eslint-disable prettier/prettier */

import * as common from "@nestjs/common";
import { TokenService } from "./token.service";
import { UserService } from "src/users/users.service";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from "src/common/interfaces/authenticated-request";
import { RefreshTokenRepository } from "./refresh-token.repository";
import { createHash } from 'crypto';
import { access } from "fs";

function sha256Hex(data: string): string {
  return createHash('sha256').update(data).digest('hex'); 
}

@ApiTags("Autorizacion para usuarios")
@common.Controller("auth")
export class AuthController {
    constructor(
        private readonly tokenService: TokenService,
        private readonly userService: UserService,
        private readonly refreshRepo: RefreshTokenRepository,
    ){}


      @ApiOperation({ summary: "Hacer login para admins" })
      @common.Post("loginadmin")
      @common.HttpCode(200) 
        async loginadmin(
      @common.Req() req: any,
      @common.Body() loginDto: { email: string; password: string })
     {
      const user = await this.userService.validateUser(
        loginDto.email,
        loginDto.password
      );
    
    
      if (user && user.is_admin === 1) {
        const token = await this.tokenService.generateAccessToken(user);
        const refreshToken = await this.tokenService.generateRefreshToken(user);
        const exp = this.tokenService.getTokenExp(refreshToken);
    
        await this.refreshRepo.insert({
          userId: user.id,
          tokenHash: sha256Hex(refreshToken),
          userAgent: (req.headers["user-agent"] as string) ?? null,
          expiresAt: new Date(exp * 1000),
        });
    
        return { token, refreshToken };
      }
    
      if (user) {
        throw new common.ForbiddenException("No tienes permisos de administrador");
      }
    
      throw new common.UnauthorizedException("Credenciales incorrectas");
    
    
     }
    

    @ApiOperation({summary: "Hacer login para usuarios"})
    @common.Post("login")
    @common.HttpCode(200)
    async login(
        @common.Req() req: any, 
        @common.Body() loginDto: 
        { email: string; password: string }) {
        const user= await this.userService.validateUser(loginDto.email, loginDto.password);
        if(!user){
            throw new common.UnauthorizedException ("Invalid credentials" );
        }

        const token= await this.tokenService.generateAccessToken(user);
        const refreshToken= await this.tokenService.generateRefreshToken(user);
        const exp = this.tokenService.getTokenExp(refreshToken); 
        await this.refreshRepo.insert({
            userId: user.id,
            tokenHash: sha256Hex(refreshToken),
            userAgent: (req.headers["user-agent"] as string) ?? null,
            expiresAt: new Date(exp * 1000),
            });
            
        return { 
            access_token: token,
            refresh_token: refreshToken,
        };
    }

    @ApiOperation({summary: "Hacer logout para usuarios y admins"})
    @common.Post("logout")
    async logout(
        @common.Req() req: AuthenticatedRequest,
        @common.Body() body: { token?: string } 
    ){
    if (!body?.token) {
        throw new common.BadRequestException("Missing refresh token");
    }

    let userId: number | null = null;
        const auth = req.headers['authorization'] ?? '';
        const [, accessToken] = (Array.isArray(auth) ? auth[0] : auth).split(' ');
        if (!accessToken) throw new common.UnauthorizedException('Missing Authorization header');
        const payload = await this.tokenService.verifyAccessToken(accessToken);
        userId = Number(payload.sub);

        if (Number.isNaN(userId)) throw new common.UnauthorizedException('Invalid user id in token');
        const hash = sha256Hex(body.token);

        const row = await this.refreshRepo.findByHash(hash);
        if (!row) throw new common.UnauthorizedException("Unknown refresh token");
        if (row.user_id !== userId) throw new common.UnauthorizedException("Token does not belong to this user");
        if (row.revoked_at) return { ok: true, message: "Already logged out" }; 

        await this.refreshRepo.revokeByHash(hash, "USER_LOGOUT");
        return { ok: true, message: "Logged out" };
}

    @ApiOperation({summary: "Conseguir el refresh token"})
    @common.Post('refresh')
    async refresh(@common.Body() dto: { token: string }) {
        if (!dto?.token) throw new common.BadRequestException('Missing refresh token');

        const payload = await this.tokenService.verifyRefreshToken(dto.token).catch(() => null);
        if (!payload) throw new common.UnauthorizedException('Invalid refresh token');

        const hash = sha256Hex(dto.token);
        const row = await this.refreshRepo.findByHash(hash);
        if (!row) throw new common.UnauthorizedException('Unknown refresh token');
        if (row.revoked_at) throw new common.UnauthorizedException('Refresh token revoked');
        if (row.user_id !== Number(payload.sub)) throw new common.UnauthorizedException('Token/user mismatch');

        const user = await this.userService.findById(Number(payload.sub));
        const access = await this.tokenService.generateAccessToken(user);


        return { access_token: access };
}



    @common.Get("profile")
    @common.UseGuards(JwtAuthGuard)
    getProfile(@common.Req() req: AuthenticatedRequest) {
        return {profile:req.user.profile}
    }
}