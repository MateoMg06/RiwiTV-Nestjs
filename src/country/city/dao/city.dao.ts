
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from '../entities/city.entity.js';
import { CreateCityDto } from '../dto/create-city.dto.js';

export class CityDao {
  constructor(
    @InjectRepository(City)
    private readonly repository: Repository<City>
  ) {}

  async findAll(): Promise<City[]> {
    return this.repository.find();
  }

  async findOne(id: number): Promise<City | null> {
    return this.repository.findOneBy({ id });
  }

  async create(dto: CreateCityDto): Promise<City> {
    const entity = this.repository.create(dto);
    return this.repository.save(entity);
  }

  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}