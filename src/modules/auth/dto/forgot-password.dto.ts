import { IsEmail } from 'class-validator';

/** Solicitud de recuperación de contraseña (HU-007): solo el correo. */
export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}
