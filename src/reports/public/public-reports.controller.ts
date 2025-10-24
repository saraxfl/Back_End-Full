/* eslint-disable prettier/prettier */
import { Controller, Get, Query } from '@nestjs/common';
import { PublicReportsService } from './public-reports.service';
import { PublicSearchDto } from './dto/public-search.dto';
import { PublicRankingDto } from './dto/public-ranking.dto';
import { PublicFeedDto } from './dto/public-feed.dto';

@Controller('public/reports')
export class PublicReportsController {
  constructor(private readonly svc: PublicReportsService) {}

  @Get('search')
  async search(@Query() dto: PublicSearchDto) {
    return this.svc.search(dto);
  }

  @Get('domains')
  async topDomains(@Query() dto: PublicRankingDto) {
    return this.svc.topDomains(dto);
  }

  @Get('feed')
  async feed(@Query() dto: PublicFeedDto) {
    return this.svc.feed(dto);
  }
}
