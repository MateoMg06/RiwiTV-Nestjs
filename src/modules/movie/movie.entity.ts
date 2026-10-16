import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AgeRating, MovieStatus } from '../../common/enums/domain.enums.js';

/** Película. Solo las columnas de la cartelera (HU-003); el detalle (HU-004) añade el resto. */
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
}
