import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { MembershipStatus } from '../../common/enums/domain.enums.js';

/**
 * Membresía digital (HU-006). Una por usuario y con código único: ambos índices únicos
 * los hace cumplir la BD, también ante peticiones simultáneas. Columnas planas: sin relaciones.
 */
@Entity('Memberships')
export class Membership {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  userId: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @Column({ type: 'enum', enum: MembershipStatus, default: MembershipStatus.ACTIVE })
  status: MembershipStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
