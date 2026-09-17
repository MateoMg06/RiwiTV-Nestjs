import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Country } from "./country/entities/country.entity.js";
import { CountryModule } from "./country/country.module.js";
import { City } from "./country/city/entities/city.entity.js";
import { Department } from "./country/department/entities/department.entity.js";

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