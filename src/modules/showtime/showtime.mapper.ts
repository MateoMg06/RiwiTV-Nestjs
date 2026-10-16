import type { AudioType, ShowFormat, ShowtimeStatus } from '../../common/enums/domain.enums.js';
import type { Showtime } from './showtime.entity.js';

export interface WeeklyShowtime {
  id: number;
  startsAt: Date;
  format: ShowFormat;
  language: string;
  roomType: string;
  audioType: AudioType;
  status: ShowtimeStatus;
  price: number;
  cinema: { id: number; name: string };
}

export const toShowtime = (showtime: Showtime): WeeklyShowtime => ({
  id: showtime.id,
  startsAt: showtime.startsAt,
  format: showtime.format,
  language: showtime.language,
  roomType: showtime.roomType,
  audioType: showtime.audioType,
  status: showtime.status,
  price: Number(showtime.price),
  cinema: { id: showtime.cinema.id, name: showtime.cinema.name },
});
