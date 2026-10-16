import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { CountryService } from './country.service.js';
import { DepartmentService } from './department/department.service.js';
import { CityService } from './city/city.service.js';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('ubicación')
@Controller()
export class LocationController {
  constructor(
    private readonly countryService: CountryService,
    private readonly departmentService: DepartmentService,
    private readonly cityService: CityService,
  ) {}

  @ApiOperation({ summary: 'Listar países', description: 'HU-002. Público.' })
  @ApiOkResponse({ description: 'Lista de países con la forma `{ id, country }`.' })
  @Get('countries')
  @Public()
  listCountries() {
    return this.countryService.findAll();
  }

  @ApiOperation({ summary: 'Listar departamentos de un país', description: 'HU-002. Público.' })
  @ApiOkResponse({
    description: 'Departamentos del país con la forma `{ id, department, countryId }`.',
  })
  @ApiBadRequestResponse({ description: 'El id no es numérico.' })
  @ApiNotFoundResponse({ description: 'El país no existe.' })
  @Get('departments/:countryId')
  @Public()
  listDepartments(@Param('countryId', ParseIntPipe) countryId: number) {
    return this.departmentService.findByCountry(countryId);
  }

  @ApiOperation({
    summary: 'Listar ciudades activas de un departamento',
    description: 'HU-002. Público. Solo se devuelven las ciudades activas.',
  })
  @ApiOkResponse({
    description: 'Ciudades activas con la forma `{ id, city, departmentId, active }`.',
  })
  @ApiBadRequestResponse({ description: 'El id no es numérico.' })
  @ApiNotFoundResponse({ description: 'El departamento no existe.' })
  @Get('cities/:departmentId')
  @Public()
  listCities(@Param('departmentId', ParseIntPipe) departmentId: number) {
    return this.cityService.findByDepartment(departmentId);
  }
}
