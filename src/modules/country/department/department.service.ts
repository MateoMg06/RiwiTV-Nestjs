import { Injectable, NotFoundException } from '@nestjs/common';
import { CountryDao } from '../country.dao.js';
import { DepartmentDao } from './department.dao.js';

@Injectable()
export class DepartmentService {
  constructor(
    private readonly countryDao: CountryDao,
    private readonly departmentDao: DepartmentDao,
  ) {}

  async findByCountry(countryId: number) {
    if (!(await this.countryDao.findById(countryId))) {
      throw new NotFoundException('País no encontrado');
    }
    const departments = await this.departmentDao.findByCountryId(countryId);
    return departments.map((d) => ({ id: d.id, department: d.name, countryId }));
  }
}
