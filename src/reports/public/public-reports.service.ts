/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { ReportsRepository } from '../reports.repository';
import { PublicSearchDto } from './dto/public-search.dto';
import { PublicRankingDto } from './dto/public-ranking.dto';
import { PublicFeedDto } from './dto/public-feed.dto';

@Injectable()
export class PublicReportsService {
  constructor(private readonly repo: ReportsRepository) {}

  async search(dto: PublicSearchDto) {
    const domain = dto.domain
      ? this.normalizeDomain(dto.domain)
      : (dto.url ? this.extractHost(dto.url) : undefined);

    const rows = await this.repo.searchPublic({
      categoryId: dto.categoryId,
      domain,                  
      limit: dto.limit ?? 50,
      offset: dto.offset ?? 0,
      order: dto.order ?? 'newest',
    });

    return rows.map(this.projectPublic);
  }

  
  private extractHost(raw: string): string | undefined {
    try {
      const u = new URL(raw);
      return this.normalizeDomain(u.host);
    } catch { return undefined; }
  }

  private normalizeDomain(host: string): string {
    return String(host).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
  }

  async topDomains(dto: PublicRankingDto) {
    const rows = await this.repo.getTopDomainsPublic({
      windowDays: dto.window ?? 30,
      limit: dto.limit ?? 5,
      offset: dto.offset ?? 0,
    });

    
    return rows.map((r: any) => ({
      category: r.top_category_name ?? null,
      url: r.page_url ?? null, 
    }));
  }


  
  private projectPublic = (r: any) => ({
    reporter: r.reporter_name,
    url: r.page_url,
    description: r.description,
    image_url: r.cover_path ? `/${String(r.cover_path).replace(/^public\//, 'public/')}` : null,
    category: r.category_name ?? null,
    created_at: r.created_at,
  });

  async feed(dto: PublicFeedDto) {
    const rows = await this.repo.listPublicFeed({
      order: dto.order ?? 'newest',
      limit: dto.limit ?? 50,
      offset: dto.offset ?? 0,
      windowDays: dto.window ?? 180,
    });


    return rows.map((r: any) => ({
      reporter: r.reporter_name, 
      url: r.page_url,
      description: r.description,
      image_url: r.cover_path ? `/${String(r.cover_path).replace(/^public\//, 'public/')}` : null,
      category: r.category_name ?? null,
      created_at: r.created_at,
    }));
  }
}
