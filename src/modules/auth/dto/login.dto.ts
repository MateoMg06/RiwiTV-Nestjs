import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

/**
 * Credenciales de inicio de sesion.
 *
 * No se valida el formato de la contrasena aqui: en login solo importa que
 * exista. Si se exigiera 8 caracteres, un usuario con una contrasena vieja de
 * 6 no podria entrar y el error seria "credenciales invalidas", no "contrasena
 * corta". La politica de complejidad aplica al REGISTRO, no al acceso.
 */
export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}

/**
 * Canje de un refresh token por un nuevo par de tokens.
 *
 * El refresh token viaja en el CUERPO, no solo en la cookie httpOnly: los
 * clientes nativos (movil, TV) no manejan cookies. El navegador lo envia
 * tambien por cookie, y el controller lo lee de ahi.
 */
export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  @Length(20, 4096)
  refreshToken: string;
}
