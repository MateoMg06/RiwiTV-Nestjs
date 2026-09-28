
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from '../entities/country.entity.js';
import { CreateCountryDto } from '../dto/create-country.dto.js';
import {Department} from "../department/entities/department.entity.js";


export class CountryDao {
  constructor(
    @InjectRepository(Country)
    private readonly repository: Repository<Country>
  ) {}

  async findAll(): Promise<Country[]> {
    return this.repository.find();
  }

  async findOne(id: number): Promise<Country | null> {
    return this.repository.findOneBy({ id });
  }

  async create(dto: CreateCountryDto): Promise<Country> {
    const entity = this.repository.create(dto);
    return this.repository.save(entity);
  }

  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
  }

    async getDepartments(countryId: number): Promise<Department[] | null> {
    const country = await this.repository.findOne({
    where: { id: countryId },
    relations: { departments: true },
  });
  return country?.departments || null;
}


}