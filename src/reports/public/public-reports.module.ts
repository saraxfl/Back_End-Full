/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { PublicReportsController } from './public-reports.controller';
import { PublicReportsService } from './public-reports.service';
import { ReportsModule } from '../reports.module'; 

@Module({
  imports: [ReportsModule], 
  controllers: [PublicReportsController],
  providers: [PublicReportsService],
})
export class PublicReportsModule {}
