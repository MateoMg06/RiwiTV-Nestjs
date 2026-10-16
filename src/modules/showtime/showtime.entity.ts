import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AudioType, ShowFormat, ShowtimeStatus } from '../../common/enums/domain.enums.js';
import { Movie } from '../movie/movie.entity.js';
import { Cinema } from '../cinema/cinema.entity.js';

/** Función. Cartelera (HU-003) y precio (HU-004); sala concreta y `availableSeats` llegan con HU-009/010. */
@Entity('Showtimes')
export class Showtime {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Movie, { nullable: false })
  movie: Movie;

  @ManyToOne(() => Cinema, { nullable: false })
  cinema: Cinema;

  @Index()
  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'enum', enum: ShowFormat, default: ShowFormat.DOS_D })
  format: ShowFormat;

  @Column({ type: 'varchar', default: 'Español' })
  language: string;

  // Tipo de sala (`room_type` del original), texto libre.
  @Column({ type: 'varchar', length: 30, default: 'STANDARD' })
  roomType: string;

  @Column({ type: 'enum', enum: AudioType })
  audioType: AudioType;

  @Column({ type: 'enum', enum: ShowtimeStatus, default: ShowtimeStatus.ACTIVE })
  status: ShowtimeStatus;

  /** Postgres devuelve `decimal` como string; el service lo convierte a número. */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  price: string;

  /** Máximo de sillas por usuario en esta función (HU-010); null = `MAX_SEATS_PER_RESERVATION`. */
  @Column({ type: 'int', nullable: true })
  maxSeatsPerReservation: number | null;
}
