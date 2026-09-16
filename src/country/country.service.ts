import { Injectable } from '@nestjs/common';
import { CreateCountryDto } from './dto/create-country.dto.js';
import { CreateCityDto } from './city/dto/create-city.dto.js';
import { CreateDepartmentDto } from './department/dto/create-department.dto.js';
import { DepartmentService } from './department/department.service.js';
import { CityService } from './city/city.service.js';
import { ICountryService } from './interfaces/country.interfaces.js';

@Injectable()
export class CountryService implements ICountryService {
  constructor(
    @Injectable(Country) 
    private readonly countryRepository: Repository<Country>, private readonly departmentService: DepartmentService, private readonly cityService: CityService) {}
  create(country: string) {
    return "d"
  }

  findAll() {
    return `This action returns all countries`;
  }

  findOne(id: number) {
    return `This action returns a #${id} country`;
  }

  remove(id: number) {
    return `This action removes a #${id} country`;
  }
}
  