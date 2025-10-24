import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './reports.repository';
import { DbModule } from 'src/db/db.module';
import { AuthModule } from '../auth/auth.module';            
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminReportsService} from "./reports.service";


@Module({
  imports: [DbModule, AuthModule],
  controllers: [ReportsController ],
  providers: [ReportsService,AdminReportsService, ReportsRepository, JwtAuthGuard],
  exports: [ReportsService,AdminReportsService, ReportsRepository],
})
export class ReportsModule {}
