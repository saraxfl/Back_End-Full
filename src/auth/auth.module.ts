/* eslint-disable prettier/prettier */


import { Module } from "@nestjs/common";
import { UsersModule } from "src/users/users.module";
import { JwtModule } from '@nestjs/jwt';
import { TokenService } from "./token.service";
import { AuthController } from "./auth.controller";
import { RefreshTokenRepository } from './refresh-token.repository';
import { RefreshCleanerService } from "./refresh-cleaner.service";


@Module({
    imports: [UsersModule, JwtModule.register({
      secret: 'supersecret',
      signOptions: { expiresIn: '1d' },})
    ],
    providers:[TokenService, RefreshTokenRepository, RefreshCleanerService],
    controllers: [AuthController],
    exports: [TokenService, JwtModule, RefreshTokenRepository]
})
export class AuthModule {}