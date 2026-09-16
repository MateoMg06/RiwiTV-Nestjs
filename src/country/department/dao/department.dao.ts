import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { CreateDepartmentDto } from "../dto/create-department.dto.js";
import { Department } from "../entities/department.entity.js";

@Injectable()
export class DepartmentDao{
    constructor(private readonly dataSource: DataSource){}

    private get repo(): Repository<Department>{
        return this.dataSource.getRepository(Department)
    }

    async create(dto: CreateDepartmentDto): Promise<Department>{
        const department= await this.repo.create({...dto, isActive: true})
        return this.repo.save(department)
    }

    async findById(id: number): Promise<Department | null>{
        return this.repo.findOne({where: {id}})
    }

    async delete(id: number): Promise<void>{
        await this.repo.delete({id})
    }
}