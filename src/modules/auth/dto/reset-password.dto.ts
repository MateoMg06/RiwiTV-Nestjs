import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

/**
 * Restablecimiento de contraseña con el token recibido por correo (HU-007).
 *
 * El token es `randomBytes(32).toString('hex')` (64 hex); el patrón evita consultar la BD con
 * basura. La política de la contraseña (RN-022) coincide con la del registro: 10–72 caracteres
 * en el DTO y complejidad en `Password.validatePassword` (el service).
 */
export class ResetPasswordDto {
  @IsString()
  @Matches(/^[0-9a-f]{64}$/, { message: 'token de restablecimiento invalido' })
  token: string;

  @IsString()
  @Length(10, 72)
  password: string;

  @IsNotEmpty()
  @IsString()
  confirmPassword: string;
}
