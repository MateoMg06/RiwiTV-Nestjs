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
 * Sesion activa de un usuario.
 *
 * DECISION DE DISENO (la razon de separar esto del User):
 * Un usuario puede estar conectado simultaneamente en movil, laptop y TV.
 * Guardar un unico par access/refreshToken en la fila de User hace que el
 * segundo login pise al primero y que "cerrar sesion" sea ambiguo.
 *
 * Con esta tabla:
 *  - N sesiones por usuario, cada una con su propio refresh token.
 *  - "Cerrar sesion en todos los dispositivos" = revocar todas sus filas.
 *  - Detectar robo de token: la fila registra desde que IP y que user-agent
 *    nacieron, datos que no tienen sentido a nivel de cuenta.
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
