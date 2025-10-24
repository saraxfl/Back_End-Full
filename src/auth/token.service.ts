/* eslint-disable prettier/prettier */

import { Injectable, UnauthorizedException} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";


export type UserProfile = {
    id: number;
    email: string;
    name: string;
    is_admin: number;
};

export type AccessPayload={
    sub:string,
    type:"access",
    profile:UserProfile
}

export type RefreshPayload={
    sub:string,
    type:"refresh",
}

@Injectable()
export class TokenService {
    constructor(private readonly jwtService:JwtService){}

    async generateAccessToken(profile:UserProfile):Promise<string>{
        return this.jwtService.signAsync({
            sub:profile.id.toString(), 
            type:"access",
            profile
        } satisfies AccessPayload,
        {
            secret:"supersecret",
            expiresIn:"15m"
        })
    }
    async generateRefreshToken(profile:UserProfile):Promise<string>{
        return this.jwtService.signAsync({
            sub:profile.id.toString(),
            type:"refresh"
        } satisfies RefreshPayload,
        {
            secret:"supersecret",
            expiresIn:"7d"
        })
    }

    async verifyAccessToken(token:string):Promise<AccessPayload>{
        const payload= await this.jwtService.verifyAsync<AccessPayload>(token,{
            secret:"supersecret"
        });
        if(payload.type!=="access"){
            throw new Error("Invalid token type");
        }
        return payload;
    }
    async verifyRefreshToken(token:string):Promise<RefreshPayload>{
        const payload= await this.jwtService.verifyAsync<RefreshPayload>(token,{
            secret:"supersecret"
        });
        if(payload.type!=="refresh"){
            throw new Error("Invalid token type");
        }
        return payload;
    }

    getTokenExp(refreshToken: string): number {
        const decoded: any = this.jwtService.decode(refreshToken);
        if (!decoded?.exp){
            throw new UnauthorizedException('Invalid token (no exp)');
        }
        return decoded.exp as number;
}
}