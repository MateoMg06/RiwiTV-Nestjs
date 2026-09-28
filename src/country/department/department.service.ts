import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IDepartmentService } from './interfaces/department.interface.js';
import { Department } from './entities/department.entity.js';
import { Repository } from 'typeorm';
import { City } from '../city/entities/city.entity.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { DepartmentDao } from './dao/department.dao.js';



@Injectable()
export class DepartmentService implements IDepartmentService {
    constructor(
        @InjectRepository(Department)
        private readonly departmentDao: DepartmentDao,
        private readonly departmentRepository: Repository<Department>,
    ) {}
    

    /**
    * crea departamentos
    * 
    */
    async create(dto:CreateDepartmentDto): Promise<Department>{
        const department = this.departmentDao.create(dto);

        return await this.departmentDao.create(dto)
    }

    /**
     * encuentra todos los departamentos
     * 
     */
    
    async findAll(): Promise<Department[]> {
        return this.departmentDao.findAll();
    }


    /**
     * encuentra todos los paises por id
     * 
     */
    async findOne(id: number): Promise<Department | null> {
        return this.departmentDao.findOne(id);
    }

    /**
   * elimina los departamentos por id
   
   * 
   */
  
  async remove(id: number): Promise<void> {
    await this.departmentDao.remove(id);
  }

  /**
   * obtiene las ciudades de un departamento por id
   * 
   */
  async getCities(departmentId: number): Promise<City[]> {
    const cities = await this.departmentDao.getCities(departmentId);
    return cities ?? [];
  }

}