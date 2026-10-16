import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpcomingNotificationDto {
  @Type(() => Number)
  @IsInt({ message: 'movieId debe ser un entero positivo' })
  @Min(1, { message: 'movieId debe ser un entero positivo' })
  movieId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'cityId debe ser un entero positivo' })
  @Min(1, { message: 'cityId debe ser un entero positivo' })
  cityId?: number;
}
