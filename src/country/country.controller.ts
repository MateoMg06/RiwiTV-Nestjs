import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { CountryService } from './country.service.js';
import { CreateCountryDto } from './dto/create-country.dto.js';

@Controller('pais')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Post()
  create(@Body() dto: CreateCountryDto) {
    return this.countryService.create(dto);
  }

  @Get()
  findAll() {
    return this.countryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.countryService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.countryService.remove(+id);
  }


  @Get(':id/departamentos')
  findDepartmentsByCountry(@Param('id') countryId: number) {
    return this.countryService.getDepartments(+countryId);
  }
}
