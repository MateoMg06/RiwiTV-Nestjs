import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { CountryService } from './country.service.js';
import { Public } from '../../common/decorators/public.decorator.js';

@Controller('pais')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Post()
  create(@Body() country: string) {
    return this.countryService.create(country);
  }

  @Get()
  @Public()
  findAll() {
    return this.countryService.findAll();
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.countryService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.countryService.remove(+id);
  }
}
