import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class SetLocationDto {
  @Type(() => Number)
  @IsInt({ message: 'cityId debe ser un entero positivo' })
  @Min(1, { message: 'cityId debe ser un entero positivo' })
  cityId: number;
}
