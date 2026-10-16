import { PartialType, PickType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional, IsUrl, MaxLength } from 'class-validator';
import { CreateUserDto } from '../user/create-user.dto.js';

/**
 * Solo los campos que el usuario puede editar en su perfil (HU-008). Con `forbidNonWhitelisted`,
 * cualquier otro (`role`, `accountStatus`, `password`, `level`, `cityId`, `favoriteCinemaId`,
 * `birthDate`, documento…) da 400. `email` + `confirmEmail` inician la verificación del
 * nuevo correo (RN-034); deben coincidir. `cityId` solo cambia por `POST /users/location` (RN-006).
 */
export class UpdateProfileDto extends PartialType(
  PickType(CreateUserDto, [
    'name',
    'lastName',
    'phone',
    'gender',
    'email',
    'confirmEmail',
  ] as const),
) {
  /** URL https de la foto; `null` la quita. No hay subida de archivos. */
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  photoUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  acceptsNotifications?: boolean;
}
