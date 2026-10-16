import { Injectable } from '@nestjs/common';
import { DepartmentService } from './department/department.service.js';
import { CityService } from './city/city.service.js';

@Injectable()
export class CountryService  {
  constructor(private readonly departmentService: DepartmentService, private readonly cityService: CityService) {}
  create(_country: string) {
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
  