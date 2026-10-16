import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthDao } from './auth.dao.js';
import { Session } from './entities/session.entity.js';
import { MembershipModule } from '../membership/membership.module.js';
import { UserModule } from '../user/user.module.js';
import { UtilsModule } from '../../common/utils/utils.module.js';
import { ConfigModule } from '../../config/config.module.js';

/**
 * Modulo de autenticacion.
 *
 * `UserModule` se importa porque AuthService crea usuarios (registro), busca
 * usuarios para el login y valida que la cuenta siga activa al renovar el
 * token. Exportarlo aqui seria incorrecto: el modulo de auth no debe ofrecer
 * el servicio de usuarios a los demás.
 *
 * `ConfigModule` aporta el `ConfigService`, del que se leen los secretos JWT.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Session]),
    UserModule,
    MembershipModule,
    UtilsModule,
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthDao],
  exports: [AuthService],
})
export class AuthModule {}
