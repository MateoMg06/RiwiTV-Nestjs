import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AgeRating, MovieStatus } from '../../common/enums/domain.enums.js';

/** Película: columnas de la cartelera (HU-003) y del detalle (HU-004). */
@Entity('Movies')
export class Movie {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  genre: string;

  @Column({ type: 'enum', enum: AgeRating })
  classification: AgeRating;

  /** Minutos. */
  @Column({ type: 'int' })
  duration: number;

  @Column({ type: 'varchar' })
  director: string;

  @Column({ type: 'varchar', nullable: true })
  posterUrl: string | null;

  @Column({ type: 'timestamptz' })
  releaseDate: Date;

  @Column({ type: 'enum', enum: MovieStatus, default: MovieStatus.ACTIVE })
  status: MovieStatus;

  /** Postgres devuelve `decimal` como string; el service lo convierte a número. */
  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  audienceRating: string;

  @Column({ type: 'text', default: '' })
  synopsis: string;

  /** Actores. */
  @Column({ type: 'jsonb', default: () => `'[]'` })
  cast: string[];

  @Column({ type: 'varchar', nullable: true })
  bannerUrl: string | null;

  /** Se devuelve tal cual; el embebido de YouTube es del frontend. */
  @Column({ type: 'varchar', nullable: true })
  trailerUrl: string | null;
}
