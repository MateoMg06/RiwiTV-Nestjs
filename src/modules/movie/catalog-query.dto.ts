import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { AgeRating, ShowFormat } from '../../common/enums/domain.enums.js';

/** Solo 'true' y 'false' exactos; lo demás pasa tal cual para que @IsBoolean() lo rechace. */
const toBoolean = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
  const raw = obj[key];
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return raw;
};

export class CatalogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cinemaId?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  genre?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  language?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  roomType?: string;

  // `classification=12+` se envía codificado como `12%2B` (un `+` sin codificar llega como espacio).
  @IsOptional()
  @IsEnum(AgeRating)
  classification?: AgeRating;

  @IsOptional()
  @IsEnum(ShowFormat)
  format?: ShowFormat;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date debe tener formato YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  available?: boolean;
}
