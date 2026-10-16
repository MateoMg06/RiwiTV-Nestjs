import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { CountryService } from './country.service.js';
import { DepartmentService } from './department/department.service.js';
import { CityService } from './city/city.service.js';

@Controller()
export class LocationController {
  constructor(
    private readonly countryService: CountryService,
    private readonly departmentService: DepartmentService,
    private readonly cityService: CityService,
  ) {}

  @Get('countries')
  @Public()
  listCountries() {
    return this.countryService.findAll();
  }

  @Get('departments/:countryId')
  @Public()
  listDepartments(@Param('countryId', ParseIntPipe) countryId: number) {
    return this.departmentService.findByCountry(countryId);
  }

  @Get('cities/:departmentId')
  @Public()
  listCities(@Param('departmentId', ParseIntPipe) departmentId: number) {
    return this.cityService.findByDepartment(departmentId);
  }
}
