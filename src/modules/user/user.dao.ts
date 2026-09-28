import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { User } from "./user.entity.js";
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

    findAll(): Promise<User[]>{
        return this.repo.find()
    }

    findById(id: number): Promise<User | null>{
        return this.repo.findOne({where: {id}})
    }

    findByEmail(email: string): Promise<User | null>{
        return this.repo.findOne({where: {email}})
    }

    findCityByName(name: string): Promise<City | null>{
        return this.cityRepo.findOne({where: {name}})
    }

    create(data: Partial<User>): Promise<User>{
        return this.repo.save(this.repo.create(data));
    }

    async update(id: number, data: Partial<User>): Promise<User | null>{
        await this.repo.update(id, data)
        return this.findById(id)
    }

    async delete(id: number): Promise<boolean>{
        const result= await this.repo.delete(id)
        return (result.affected ?? 0) > 0
    }
}