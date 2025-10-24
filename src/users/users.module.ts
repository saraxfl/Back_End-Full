/* eslint-disable prettier/prettier */

import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UserService } from "./users.service";
import { UsersRepository } from "./users.repository";
import { JwtModule } from "@nestjs/jwt";
import { TokenService } from "src/auth/token.service"; 

@Module({
    imports: [
        JwtModule.register({}),
    ],

    controllers: [UsersController],
    providers: [UserService, UsersRepository, TokenService],
    exports: [UserService],
})

export class UsersModule {}
