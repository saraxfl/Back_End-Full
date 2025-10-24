/* eslint-disable prettier/prettier */
import { IsIn, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PublicFeedDto {
  @IsOptional()
  @IsIn(['newest', 'random'])
  order?: 'newest' | 'random' = 'newest';

  @IsOptional()
  @Type(() => Number)
  @IsInt() @Min(1) @Max(100)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt() @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt() @Min(1) @Max(365)
  window?: number = 180;
}
