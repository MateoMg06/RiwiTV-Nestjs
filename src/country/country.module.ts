import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Country } from './entities/country.entity.js';
import { CountryController } from './country.controller.js';
import { CountryService } from './country.service.js';
import { DepartmentService } from './department/department.service.js';
import { CityService } from './city/city.service.js';
import { Department } from './department/entities/department.entity.js';
import { City } from './city/entities/city.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Country, Department, City])],
  controllers: [CountryController],
  providers: [CountryService, DepartmentService, CityService],
})
export class CountryModule {}
