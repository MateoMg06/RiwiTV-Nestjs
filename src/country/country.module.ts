import { Module } from '@nestjs/common';
import { CountryController } from './country.controller.js';
import { CountryService } from './country.service.js';
import { DepartmentService } from './department/department.service.js';
import { CityService } from './city/city.service.js';

@Module({
  controllers: [CountryController],
  providers: [CountryService, DepartmentService, CityService],
  exports: [CountryService, DepartmentService, CityService, CountryController],
})
export class CountryModule {}
