import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/user.entity.js';

/**
 * Sesion de un usuario (RN-030: una sola sesion viva por usuario).
 *
 * Cada login exitoso revoca las sesiones previas (`AuthService.login`); `logout-all` las
 * revoca todas. La tabla conserva las filas revocadas, cada una con su propio refresh token,
 * la IP y el user-agent con los que nacio: sirve para detectar la reutilizacion de un token
 * robado (la fila ya revocada) y no tiene sentido a nivel de cuenta.
 *
 * SEGURIDAD: se almacena el HASH del refresh token, no el token en claro.
 * Si alguien lee la tabla (backup, SQL injection, acceso indebido) no puede
 * reutilizar las sesiones ajenas.
 */
@Entity('Sessions')
@Index('IDX_Sessions_userId', ['userId'])
@Index('IDX_Sessions_refreshTokenHash', ['refreshTokenHash'], { unique: true })
export class Session {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  /** SHA-256 del refresh token. Nunca el token en claro. */
  @Column({ type: 'varchar' })
  refreshTokenHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  /** Si es null, la sesion sigue viva. Un logout la marca. */
  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  /** Ultimo uso, para implementacion de rotacion con ventana de gracia. */
  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  // Contexto de la sesion: util para "ver mis dispositivos" y deteccion de fraude
  @Column({ type: 'varchar', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', nullable: true })
  ip: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  /** Sesion util: no revocada y no expirada. */
  get isActive(): boolean {
    return this.revokedAt === null && this.expiresAt.getTime() > Date.now();
  }
}
