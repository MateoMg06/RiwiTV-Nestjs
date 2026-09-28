import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateCountryDto } from './dto/create-country.dto.js';
import { Department } from './department/entities/department.entity.js';
import { DepartmentService } from './department/department.service.js';
import { CityService } from './city/city.service.js';
import { ICountryService } from './interfaces/country.interfaces.js';
import { Repository } from 'typeorm';
import { Country } from './entities/country.entity.js';
import { CountryDao } from './dao/country.dao.js';
import { DepartmentDao } from './department/dao/department.dao.js';
import { CityDao } from './city/dao/city.dao.js';


@Injectable()
export class CountryService implements ICountryService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
    private readonly departmentService: DepartmentService,
    private readonly cityService: CityService,
    private readonly countryDao: CountryDao,
    private readonly departmentDao: DepartmentDao,
    private readonly cityDao: CityDao,
  ) {}

    /**
   * crea paises
   * 
   */
  
  async create(dto:CreateCountryDto):Promise <Country>{
    const country = this.countryRepository.create(dto);

    return await this.countryDao.create(dto);
  }

  /**
   * encuentra todos los paises
   * 
   */
  
  async findAll(): Promise<Country[]> {
    return this.countryDao.findAll();
  }

  /**
   * encuentra todos los paises por id
   * 
   */
  
  async findOne(id: number): Promise<Country | null> {
    return this.countryDao.findOne(id);
  }

  /**
   * elimina los paises por id
   
   * 
   */
  
  async remove(id: number): Promise<void> {
    await this.countryDao.remove(id);
  }


  /**
   * obtiene los departamentos de un pais por id
   * 
   */
  // ...existing code...
  async getDepartments(countryId: number): Promise<Department[]> {
    const departments = await this.countryDao.getDepartments(countryId);
    return departments ?? [];
  }
// ...existing code...
}

