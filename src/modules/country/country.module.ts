import { Module } from '@nestjs/common';
import { LocationController } from './location.controller.js';
import { CountryService } from './country.service.js';
import { CountryDao } from './country.dao.js';
import { DepartmentService } from './department/department.service.js';
import { DepartmentDao } from './department/department.dao.js';
import { CityService } from './city/city.service.js';
import { CityDao } from './city/city.dao.js';

@Module({
  controllers: [LocationController],
  providers: [CountryService, DepartmentService, CityService, CountryDao, DepartmentDao, CityDao],
  exports: [CityDao],
})
export class CountryModule {}
