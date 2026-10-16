import { Injectable, NotFoundException } from '@nestjs/common';
import { DepartmentDao } from '../department/department.dao.js';
import { CityDao } from './city.dao.js';

@Injectable()
export class CityService {
  constructor(
    private readonly departmentDao: DepartmentDao,
    private readonly cityDao: CityDao,
  ) {}

  async findByDepartment(departmentId: number) {
    if (!(await this.departmentDao.findById(departmentId))) {
      throw new NotFoundException('Departamento no encontrado');
    }
    const cities = await this.cityDao.findActiveByDepartmentId(departmentId);
    return cities.map((c) => ({
      id: c.id,
      city: c.name,
      departmentId,
      active: c.isActive,
    }));
  }
}
