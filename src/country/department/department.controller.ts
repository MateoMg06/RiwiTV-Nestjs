import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { DepartmentService } from './department.service.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';

@Controller('departamento')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentService.create(dto);
  }

  @Get()
  findAll() {
    return this.departmentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.departmentService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.departmentService.remove(+id);
  }


  @Get(':id/cities')
  findDepartmentsByCountry(@Param('id') countryId: number) {
    return this.departmentService.getCity(+countryId);
  }
}
