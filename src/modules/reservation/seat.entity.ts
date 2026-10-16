import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { SeatStatus, SeatType } from '../../common/enums/domain.enums.js';
import { Showtime } from '../showtime/showtime.entity.js';

/**
 * Silla de una función (HU-010). El bloqueo vive en la propia fila (`heldByUserId`, `heldUntil`):
 * no hay tabla de bloqueos aparte. `SOLD` solo lo escribe el seed; el código nunca.
 */
@Entity('Seats')
@Unique('UQ_Seats_showtime_row_number', ['showtimeId', 'row', 'number'])
@Index('IDX_Seats_status_heldUntil', ['status', 'heldUntil'])
export class Seat {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Showtime, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'showtimeId' })
  showtime: Showtime;

  @Column({ type: 'int' })
  showtimeId: number;

  @Column({ type: 'varchar', length: 2 })
  row: string;

  @Column({ type: 'int' })
  number: number;

  @Column({ type: 'enum', enum: SeatType, default: SeatType.ESTANDAR })
  type: SeatType;

  @Column({ type: 'enum', enum: SeatStatus, default: SeatStatus.AVAILABLE })
  status: SeatStatus;

  /** Recargo sobre `Showtime.price`. Postgres devuelve `decimal` como string. */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  priceModifier: string;

  /** Solo con `status = HELD`. Nunca se expone en el mapa público. */
  @Column({ type: 'int', nullable: true })
  heldByUserId: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  heldUntil: Date | null;
}
