// src/reports/dto/create-report.dto.ts
import { IsBoolean, IsOptional, IsString, IsUrl, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateReportDto {
  @IsOptional()
  @IsUrl({ require_protocol: true })
  page_url?: string;

  @IsOptional()
  @IsString()
  description?: string;


  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(v)) return true;
      if (['false', '0', 'no', 'off', ''].includes(v)) return false;
    }
    return Boolean(value);
  })
  
  @IsBoolean()
  anonymous!: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;
}
