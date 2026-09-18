import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateCountryDto } from './dto/create-country.dto.js';
import { Department } from './department/entities/department.entity.js';
import { DepartmentService } from './department/department.service.js';
import { CityService } from './city/city.service.js';
import { ICountryService } from './interfaces/country.interfaces.js';
import { Repository } from 'typeorm';
import { Country } from './entities/country.entity.js';

@Injectable()
export class CountryService implements ICountryService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
    private readonly departmentService: DepartmentService,
    private readonly cityService: CityService,
  ) {}

    /**
   * crea paises
   * 
   */
  
  async create(dto:CreateCountryDto):Promise <Country>{
    const country = this.countryRepository.create(dto);

    return await this.countryRepository.save(country);
  }

  /**
   * encuentra todos los paises
   * 
   */
  
  async findAll(): Promise<Country[]> {
    return this.countryRepository.find();
  }

  /**
   * encuentra todos los paises por id
   * 
   */
  
  async findOne(id: number): Promise<Country | null> {
    return this.countryRepository.findOneBy({ id });
  }

  /**
   * elimina los paises por id
   
   * 
   */
  
  async remove(id: number): Promise<void> {
    await this.countryRepository.delete(id);
  }


  /**
   * obtiene los departamentos de un pais por id
   * 
   */
  async getDepartments(countryId: number): Promise<Department[]> {
    const country = await this.countryRepository.findOne({
      where: { id: countryId },
      relations: { departments: true },
    });
    return country?.departments || [];
  }
}

  