import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class CatalogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cityId?: number;
}
