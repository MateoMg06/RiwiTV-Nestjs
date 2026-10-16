import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { NotificationStatus } from '../../common/enums/domain.enums.js';

/**
 * Solicitud de aviso de estreno (HU-005). El índice único `(userId, movieId)` impide duplicados
 * (RN-019) incluso con peticiones simultáneas. Columnas planas: sin relaciones.
 */
@Entity('ReleaseNotifications')
@Unique(['userId', 'movieId'])
export class ReleaseNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'int' })
  movieId: number;

  @Column({ type: 'int', nullable: true })
  cityId: number | null;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
