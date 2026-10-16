import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { SeatAuditEvent } from '../../common/enums/domain.enums.js';

/**
 * Auditoría de sillas (HU-010): bloqueos, liberaciones y vencimientos.
 *
 * Columnas planas, sin relaciones: la fila debe sobrevivir al usuario, la silla y la función.
 * `userId` es el dueño del bloqueo (también en `EXPIRED`).
 */
@Entity('SeatAudits')
@Index('IDX_SeatAudits_showtimeId', ['showtimeId'])
export class SeatAudit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @Column({ type: 'int' })
  showtimeId: number;

  @Column({ type: 'int' })
  seatId: number;

  @Column({ type: 'enum', enum: SeatAuditEvent })
  event: SeatAuditEvent;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
