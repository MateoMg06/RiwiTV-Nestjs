import * as path from 'path';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';
import { Country } from './modules/country/country.entity.js';
import { CountryModule } from './modules/country/country.module.js';
import { City } from './modules/country/city/city.entity.js';
import { Department } from './modules/country/department/department.entity.js';
import { User } from './modules/user/user.entity.js';
import { UserModule } from './modules/user/user.module.js';
import { Session } from './modules/auth/entities/session.entity.js';
import { Cinema } from './modules/cinema/cinema.entity.js';

/** Opciones de conexión, compartidas por la app y por `seeders/seed.ts`. */
export const typeOrmOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'db',
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB ?? process.env.DB_CONTAINER_NAME,
  entities: [Country, City, Department, User, Session, Cinema],
  synchronize: true,
  migrations: [`${path.dirname(__filename)}/migrations/*{.ts,.js}`],
};

@Module({
  imports: [TypeOrmModule.forRoot(typeOrmOptions), CountryModule, UserModule],
})
export class DatabaseModule {}
