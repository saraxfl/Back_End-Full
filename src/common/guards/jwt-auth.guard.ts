/* eslint-disable prettier/prettier */

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { TokenService } from "src/auth/token.service";
import { AuthenticatedRequest } from "../interfaces/authenticated-request";
import { Request } from 'express'

@Injectable()
export class JwtAuthGuard implements CanActivate{
    constructor(private readonly tokenService:TokenService){}

    async canActivate(ctx: ExecutionContext): Promise<boolean>{
        const req= ctx.switchToHttp().getRequest<Request>();
        const auth= req.headers.authorization ?? "";
        const [scheme,token]= auth.split(" ");

         if(scheme !== "Bearer" || !token)
            throw new UnauthorizedException("Fuchi de aqui!!");

        try{
            const payload= await this.tokenService.verifyAccessToken(token);
            (req as AuthenticatedRequest).user={
                userId: payload.sub,
                profile:payload.profile,
                raw:payload
            };
            return true;
        }catch{
            throw new UnauthorizedException("Token inválido");
        }
    }
}
