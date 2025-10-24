/* eslint-disable prettier/prettier */

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
//import { FileModule } from './files/file.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ReportsModule } from './reports/reports.module';
import { PublicReportsModule } from './reports/public/public-reports.module';

@Module({
  imports: [DbModule, UsersModule, ReportsModule, PublicReportsModule, AdminModule, AuthModule, ScheduleModule.forRoot(), JwtModule.register({
    global: true,
    secret: "supersecret"  
  })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
  