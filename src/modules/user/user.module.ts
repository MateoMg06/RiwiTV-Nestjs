import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { UsersLocationController } from './users-location.controller.js';
import { UserDao } from './user.dao.js';
import { CountryModule } from '../country/country.module.js';
import { CinemaModule } from '../cinema/cinema.module.js';

@Module({
  imports: [CountryModule, CinemaModule],
  controllers: [UserController, UsersLocationController],
  providers: [UserService, UserDao],
  // Se exportan porque AuthModule los necesita: el registro de usuarios vive
  // en UserService, y el login necesita consultar el hash de contrasena. Sin
  // `exports`, el contenedor no resuelve esas dependencias aunque el modulo
  // este importado.
  exports: [UserService, UserDao],
})
export class UserModule {}
