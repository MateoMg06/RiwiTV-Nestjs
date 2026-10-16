import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto.js';

/**
 * Sin `cityId`: la ciudad solo cambia por `POST /users/location`, que aplica
 * RN-006 (ciudad activa con cine activo). Con `forbidNonWhitelisted`, enviarlo
 * aquí da 400.
 */
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['cityId'] as const)) {}
