import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { City } from '../country/city/city.entity.js';
import { AccountStatus, UserRole } from '../../common/enums/domain.enums.js';

/**
 * Aggregate de identidad y perfil.
 *
 * DECISION DE DISENO: esta entidad NO guarda tokens de sesion. El par
 * access/refresh token pertenece a la entidad `Session`, porque un usuario
 * puede tener N sesiones simultaneas (movil, laptop, TV) y un unico par de
 * columnas no puede modelarlas. Ver `session.entity.ts`.
 *
 * Aqui solo queda el estado de seguridad *por cuenta* (bloqueo por intentos
 * fallidos, cuenta inactiva), que si es atributo del usuario.
 */
@Entity('Users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  /**
   * Telefono como string, no number: puede tener cero inicial, formato
   * internacional (+57...) y exceder MAX_SAFE_INTEGER.
   */
  @Column({ type: 'varchar' })
  phone: string;

  @Column({ type: 'varchar' })
  documentType: string;

  /**
   * Documento como string: los documentos de identidad conservan ceros
   * iniciales (CC 0123456789). Como number se perderian.
   */
  @Column({ type: 'varchar', unique: true })
  documentNumber: string;

  @Column({ type: 'date' })
  birthDate: Date;

  @ManyToOne(() => City, { nullable: true })
  @JoinColumn({ name: 'cityId' })
  city: City;

  @Column({ nullable: true })
  cityId: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender: string | null;

  @Column({ type: 'int', nullable: true })
  favoriteCinemaId: number | null;

  @Column({ default: false })
  acceptsDataProcessing: boolean;

  @Column({ default: false })
  acceptsTerms: boolean;

  @Column({ default: false })
  acceptsNotifications: boolean;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USUARIO })
  role: UserRole;

  @Column({ type: 'enum', enum: AccountStatus, default: AccountStatus.INACTIVE })
  accountStatus: AccountStatus;

  // --- Estado de seguridad por cuenta (no por sesion) ---

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAttemptAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  // --- Verificacion de correo ---

  @Column({ type: 'varchar', nullable: true, select: false })
  activationToken: string | null;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  activationTokenExpires: Date | null;

  // --- Recuperacion de contrasena ---

  @Column({ type: 'varchar', nullable: true, select: false })
  resetToken: string | null;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  resetTokenExpires: Date | null;
}
