import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CountryService } from './country.service.js';
import { CreateCountryDto } from './dto/create-country.dto.js';

@Controller('pais')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Post()
  create(@Body() country: string) {
    return this.countryService.create(country);
  }

  @Get()
  findAll() {
    return this.countryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.countryService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.countryService.remove(+id);
  }
}
