import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { CreateCountryDto } from "./create-country.dto.js";
import { Country } from "./country.entity.js";

@Injectable()
export class CountryDao{
    constructor(private readonly dataSource: DataSource){}

    private get repo(): Repository<Country>{
        return this.dataSource.getRepository(Country)
    }

    async create(dto: CreateCountryDto): Promise<Country>{
        const country= await this.repo.create({...dto, isActive: true})
        return this.repo.save(country)
    }

    async findById(id: number): Promise<Country | null>{
        return this.repo.findOne({where: {id}})
    }

    async delete(id: number): Promise<void>{
        await this.repo.delete({id})
    }
}