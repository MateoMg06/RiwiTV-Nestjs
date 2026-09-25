import { Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, Repository, FindOptionsRelations } from "typeorm";
import { User } from "./user.entity.js";
import { CreateUserDto } from "./create-user.dto.js";
import { City } from "../country/city/city.entity.js";

@Injectable()
export class UserDao {
    constructor(private readonly dataSource: DataSource){}

    private get repo(): Repository<User>{
        return this.dataSource.getRepository(User)
    }

    private get cityRepo(): Repository<City>{
        return this.dataSource.getRepository(City)
    }

    async create(dto: CreateUserDto): Promise<User>{
        const city = await this.cityRepo.findOne({ where: { name: dto.city } });
        if (!city) {
            throw new NotFoundException(`City with name "${dto.city}" not found`);
        }
        
        const { confirmEmail, confirmPassword, city: cityName, ...userData } = dto;
        
        if (!userData.birthDate) {
            throw new Error("birthDate is required");
        }
        
        const user = this.repo.create({
            ...userData,
            birthDate: userData.birthDate,
            city: city
        });
        
        return this.repo.save(user);
    }

    async findById(id: number): Promise<User | null>{
        const relations: FindOptionsRelations<User> = { city: true };
        return this.repo.findOne({where: {id}, relations})
    }

    async delete(id: number): Promise<void>{
        await this.repo.delete({id})
    }
}