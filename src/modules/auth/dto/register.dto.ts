import { OmitType } from '@nestjs/swagger';
import { CreateUserDto } from '../../user/create-user.dto.js';
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

/**
 * DTO del registro PUBLICO.
 *
 * DECISION DE DISENO (seguridad): el endpoint `/auth/register` esta marcado con
 * `@Public()`, es decir, cualquiera sin sesion puede llamarlo. Si usara
 * `CreateUserDto` directamente, el cliente podria enviar `{"role": "admin"}` y
 * `UserService.create()` lo respetaria (`role ?? UserRole.USUARIO`), creando una
 * escalada de privilegios trivial: basta un POST con el JSON alterado.
 *
 * `OmitType` es preferible a duplicar los ~15 campos a mano por dos razones:
 *  - las reglas de validacion viven en un solo sitio, asi que no pueden
 *    desincronizarse;
 *  - si manana se anade un campo obligatorio al alta, no hay dos DTO que
 *    actualizar y olvidar uno.
 *
 * El rol queda fuera del contrato publico. Asignar roles es tarea de un admin
 * autenticado, jamas del que se esta registrando.
 */
const BaseRegisterDto = OmitType(CreateUserDto, ['role'] as const);

export class RegisterDto extends BaseRegisterDto {
  @IsNotEmpty()
  @IsString()
  captchaToken: string;

  @IsNotEmpty()
  @IsNumber()
  captchaAnswer: number;
}
