import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Country } from "./modules/country/entities/country.entity.js";
import { CountryModule } from "./modules/country/country.module.js";
import { City } from "./modules/country/city/entities/city.entity.js";
import { Department } from "./modules/country/department/entities/department.entity.js";

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: "postgres",
            host: process.env.POSTGRES_HOST || "db",
            port: Number(process.env.POSTGRES_PORT),
            username: process.env.POSTRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.DB_CONTAINER_NAME,
            entities: [Country, City, Department],
            synchronize: true
        }),
        CountryModule
    ],
})

export class DatabaseModule {}