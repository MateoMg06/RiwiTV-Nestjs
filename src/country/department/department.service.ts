import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IDepartmentService } from './interfaces/department.interface.js';
import { Department } from './entities/department.entity.js';
import { Repository } from 'typeorm';
import { City } from '../city/entities/city.entity.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';



@Injectable()
export class DepartmentService implements IDepartmentService {
    constructor(
        @InjectRepository(Department)
        private readonly departmentRepository: Repository<Department>,
    ) {}
    

    /**
    * crea departamentos
    * 
    */
    async create(dto:CreateDepartmentDto): Promise<Department>{
        const department = this.departmentRepository.create(dto);

        return await this.departmentRepository.save(department)
    }

    /**
     * encuentra todos los departamentos
     * 
     */
    
    async findAll(): Promise<Department[]> {
        return this.departmentRepository.find();
    }


    /**
     * encuentra todos los paises por id
     * 
     */
    async findOne(id: number): Promise<Department | null> {
        return this.departmentRepository.findOneBy({id})
    }

    /**
   * elimina los departamentos por id
   
   * 
   */
  
  async remove(id: number): Promise<void> {
    await this.departmentRepository.delete(id);
  }

  /**
   * obtiene las ciudades de un departamento por id
   * 
   */
  async getCity(departmentId: number): Promise<City[]> {
    const department = await this.departmentRepository.findOne({
      where: { id: departmentId },
      relations: { cities: true },
    });
    return department?.cities || [];
  }


}

