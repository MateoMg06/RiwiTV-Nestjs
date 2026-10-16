import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';
import { MAX_SEAT_IDS_PER_REQUEST } from './lock-seats.dto.js';

export class ReleaseSeatsDto {
  @Type(() => Number)
  @IsInt({ message: 'functionId debe ser un entero positivo' })
  @Min(1, { message: 'functionId debe ser un entero positivo' })
  functionId: number;

  /** Sin `seatIds` se liberan todas las sillas bloqueadas del usuario en la función. */
  @IsOptional()
  @IsArray({ message: 'seatIds debe ser un arreglo' })
  @ArrayNotEmpty({ message: 'seatIds debe incluir al menos una silla' })
  @ArrayMaxSize(MAX_SEAT_IDS_PER_REQUEST, {
    message: `seatIds admite como máximo ${MAX_SEAT_IDS_PER_REQUEST} sillas`,
  })
  @ArrayUnique({ message: 'seatIds no admite sillas repetidas' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'seatIds debe contener enteros positivos' })
  @Min(1, { each: true, message: 'seatIds debe contener enteros positivos' })
  seatIds?: number[];
}
