import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ICityService } from './interfaces/city.interfaces.js';
import { City } from './entities/city.entity.js';
import { Repository } from 'typeorm';
import { CreateCityDto } from './dto/create-city.dto.js';

@Injectable()
export class CityService implements ICityService {
  constructor(
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
  ) {}


    /**
    * crea departamentos
    * 
    */
    async create(dto:CreateCityDto): Promise<City>{
        const city = this.cityRepository.create(dto);

        return await this.cityRepository.save(city)
    }

    /**
     * encuentra todos los departamentos
     * 
     */
    
    async findAll(): Promise<City[]> {
        return this.cityRepository.find();
    }


    /**
     * encuentra todos los paises por id
     * 
     */
    async findOne(id: number): Promise<City | null> {
        return this.cityRepository.findOneBy({id})
    }

    /**
   * elimina los departamentos por id
   
   * 
   */
  
  async remove(id: number): Promise<void> {
    await this.cityRepository.delete(id);
  }

  /**
   * obtiene las ciudades de un departamento por id
   * 
   */
 /*  async getCity(departmentId: number): Promise<City[]> {
    const department = await this.departmentRepository.findOne({
      where: { id: departmentId },
      relations: { cities: true },
    });
    return department?.cities || [];
  }
 */
}
