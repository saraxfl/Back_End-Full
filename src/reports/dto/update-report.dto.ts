/* eslint-disable prettier/prettier */
import { IsInt, IsOptional, IsString, IsUrl, Min, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateReportDto {
  @IsOptional()
  @IsUrl({ require_protocol: true })
  page_url?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      return ['true', '1', 'yes', 'on'].includes(v);
    }
    return Boolean(value);
  })
  @IsBoolean()
  deletePhoto?: boolean;
}
