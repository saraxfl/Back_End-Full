/* eslint-disable prettier/prettier */
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PublicRankingDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt() @Min(1) @Max(365)
  window?: number = 30;

  @IsOptional()
  @Type(() => Number)
  @IsInt() @Min(1) @Max(100)
  limit?: number = 5;

  @IsOptional()
  @Type(() => Number)
  @IsInt() @Min(0)
  offset?: number = 0;
}
