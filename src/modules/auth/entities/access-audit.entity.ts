import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AccessEvent } from '../../../common/enums/domain.enums.js';

/**
 * Auditoría de accesos (HU-007): quién, qué, desde dónde y cuándo.
 *
 * Columnas planas, sin relaciones: `userId` es null si el correo no existe (login fallido) y
 * la fila debe sobrevivir al usuario. NUNCA se guardan contraseñas ni tokens.
 */
@Entity('AccessAudits')
@Index('IDX_AccessAudits_userId', ['userId'])
export class AccessAudit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'enum', enum: AccessEvent })
  event: AccessEvent;

  @Column({ type: 'varchar', nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
