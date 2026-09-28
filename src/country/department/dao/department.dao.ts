import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../entities/department.entity.js';
import { CreateDepartmentDto } from '../dto/create-department.dto.js';
import { City } from '../../city/entities/city.entity.js';

export class DepartmentDao {
  constructor(
    @InjectRepository(Department)
    private readonly repository: Repository<Department>
  ) {}

  async findAll(): Promise<Department[]> {
    return this.repository.find();
  }

  async findOne(id: number): Promise<Department | null> {
    return this.repository.findOneBy({ id });
  }

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const entity = this.repository.create(dto);
    return this.repository.save(entity);
  }

  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  async getCities(departmentId: number): Promise<City[] | null> {
    const department = await this.repository.findOne({
      where: { id: departmentId },
      relations: { cities: true },
    });
    return department?.cities || null;
  }
}