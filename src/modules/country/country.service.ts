import { Injectable } from '@nestjs/common';
import { CountryDao } from './country.dao.js';

@Injectable()
export class CountryService {
  constructor(private readonly countryDao: CountryDao) {}

  async findAll() {
    const countries = await this.countryDao.findAll();
    return countries.map((c) => ({ id: c.id, country: c.name }));
  }
}
