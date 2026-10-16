import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Cinema } from './cinema.entity.js';

@Injectable()
export class CinemaDao {
  constructor(private readonly dataSource: DataSource) {}

  private get repo(): Repository<Cinema> {
    return this.dataSource.getRepository(Cinema);
  }

  countActiveByCityId(cityId: number): Promise<number> {
    return this.repo.count({ where: { city: { id: cityId }, isActive: true } });
  }
}
