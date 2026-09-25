import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { CreateCityDto } from "./create-city.dto.js";
import { City } from "./city.entity.js";

@Injectable()
export class CityDao{
    constructor(private readonly dataSource: DataSource){}

    private get repo(): Repository<City>{
        return this.dataSource.getRepository(City)
    }

    async create(dto: CreateCityDto): Promise<City>{
        const City= await this.repo.create({...dto, isActive: true})
        return this.repo.save(City)
    }

    async findById(id: number): Promise<City | null>{
        return this.repo.findOne({where: {id}})
    }

    async delete(id: number): Promise<void>{
        await this.repo.delete({id})
    }
}