import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AudioType, ShowFormat, ShowtimeStatus } from '../../common/enums/domain.enums.js';
import { Movie } from '../movie/movie.entity.js';
import { Cinema } from '../cinema/cinema.entity.js';

/** Función. Solo las columnas de la cartelera (HU-003); precio y sala concreta llegan con HU-009. */
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
}
