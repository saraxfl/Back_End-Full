/* eslint-disable prettier/prettier */
import { IsInt, IsOptional, IsUrl, Min, Max, IsIn, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PublicSearchDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt() @Min(1)
  categoryId?: number;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  url?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt() @Min(1) @Max(100)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt() @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsIn(['newest','oldest'])
  order?: 'newest' | 'oldest' = 'newest';
}
