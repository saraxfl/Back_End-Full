/* eslint-disable prettier/prettier */

import { Module } from '@nestjs/common';
import { AdminUserController } from './admin-user.controller';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AdminGuard } from 'src/common/guards/admin.guard';
import {ReportsModule} from "src/reports/reports.module";
import {AdminReportsController} from './admin-reports.controller';

@Module({
  imports: [
    AuthModule,  
    UsersModule,ReportsModule,
  ],
  controllers: [AdminUserController, AdminReportsController],
  providers: [
    JwtAuthGuard, 
    AdminGuard,
  ],
})
export class AdminModule {}
