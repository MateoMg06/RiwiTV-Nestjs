import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Country } from "./modules/country/country.entity.js";
import { CountryModule } from "./modules/country/country.module.js";
import { City } from "./modules/country/city/city.entity.js";
import { Department } from "./modules/country/department/department.entity.js";
import { User } from "./modules/user/user.entity.js";
import { UserModule } from "./modules/user/user.module.js";

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: "postgres",
            host: process.env.POSTGRES_HOST || "db",
            port: Number(process.env.POSTGRES_PORT),
            username: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.DB_CONTAINER_NAME,
            entities: [Country, City, Department, User],
            synchronize: true
        }),
        CountryModule, UserModule
    ],
})

export class DatabaseModule {}