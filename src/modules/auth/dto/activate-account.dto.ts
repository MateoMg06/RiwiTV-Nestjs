import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * Token de confirmacion de cuenta.
 *
 * `randomBytes(32).toString('hex')` produce 64 caracteres hexadecimales, asi
 * que el patron obliga a exactement ese formato. No es defensa real (la
 * validacion fuerte la hace el DAO al buscar y comparar), pero evita gastar una
 * consulta a la base de datos por cada peticion con basura en el cuerpo.
 */
export class ActivateAccountDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9a-f]{64}$/, {
    message: 'token de activacion invalido',
  })
  token: string;
}
