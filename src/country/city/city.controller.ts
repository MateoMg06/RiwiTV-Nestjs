import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { CityService } from './city.service.js';
import { CreateCityDto } from './dto/create-city.dto.js';

@Controller('ciudad')
export class CityController {
  constructor(private readonly cityService: CityService) {}

  @Post()
  create(@Body() dto: CreateCityDto) {
    return this.cityService.create(dto);
  }

  @Get()
  findAll() {
    return this.cityService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.cityService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.cityService.remove(+id);
  }

/* 
  @Get(':id/cities')
  findDepartmentsByCountry(@Param('id') countryId: number) {
    return this.cityService.getCity(+countryId);
  } */
}
