import { Injectable, NotFoundException } from '@nestjs/common';
import { AgeRating, ShowFormat, ShowtimeStatus } from '../../common/enums/domain.enums.js';
import { ShowtimeDao } from './showtime.dao.js';
import type { Showtime } from './showtime.entity.js';
import { toShowtime, type WeeklyShowtime } from './showtime.mapper.js';

export interface FunctionDetail extends WeeklyShowtime {
  movie: {
    id: number;
    name: string;
    duration: number;
    classification: AgeRating;
    posterUrl: string | null;
  };
}

export interface FunctionPrice {
  functionId: number;
  format: ShowFormat;
  roomType: string;
  startsAt: Date;
  status: ShowtimeStatus;
  price: number;
}

@Injectable()
export class ShowtimeService {
  constructor(private readonly showtimeDao: ShowtimeDao) {}

  async getById(id: number): Promise<FunctionDetail> {
    const showtime = await this.findSelectableOrFail(id);
    const { movie } = showtime;
    return {
      ...toShowtime(showtime),
      movie: {
        id: movie.id,
        name: movie.name,
        duration: movie.duration,
        classification: movie.classification,
        posterUrl: movie.posterUrl,
      },
    };
  }

  /** Precio de lista de la función (RN-037), calculado en cada petición (RN-038). */
  async getPrices(id: number): Promise<FunctionPrice> {
    const showtime = await this.findSelectableOrFail(id);
    return {
      functionId: showtime.id,
      format: showtime.format,
      roomType: showtime.roomType,
      startsAt: showtime.startsAt,
      status: showtime.status,
      price: Number(showtime.price),
    };
  }

  private async findSelectableOrFail(id: number): Promise<Showtime> {
    const showtime = await this.showtimeDao.findSelectableById(id);
    if (!showtime) throw new NotFoundException('Función no encontrada');
    return showtime;
  }
}
