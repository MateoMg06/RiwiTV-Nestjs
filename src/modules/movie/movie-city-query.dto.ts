import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/** Query del detalle y las funciones de una película: solo `cityId` (no los filtros de la cartelera). */
export class MovieCityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cityId?: number;
}
