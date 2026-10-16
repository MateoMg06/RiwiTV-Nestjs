import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError, Repository } from 'typeorm';
import { Membership } from './membership.entity.js';
import { MembershipStatus } from '../../common/enums/domain.enums.js';

/** Código de Postgres para violación de restricción única. */
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class MembershipDao {
  constructor(private readonly dataSource: DataSource) {}

  private get repo(): Repository<Membership> {
    return this.dataSource.getRepository(Membership);
  }

  findByUserId(userId: number): Promise<Membership | null> {
    return this.repo.findOne({ where: { userId } });
  }

  /**
   * Con `manager` participa en la transacción del registro. El INSERT va en un savepoint
   * (`manager.transaction`) para que un fallo por duplicado no aborte la transacción entera.
   *
   * Devuelve `null` si el código ya existe (el service reintenta con otro). Si el usuario ya
   * tiene membresía lanza 409. El índice único decide ambos casos, sin consulta previa.
   */
  async create(
    data: { userId: number; code: string; status: MembershipStatus },
    manager?: EntityManager,
  ): Promise<Membership | null> {
    try {
      return await (manager ?? this.dataSource).transaction((m) => {
        const repo = m.getRepository(Membership);
        return repo.save(repo.create(data));
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string } | undefined)?.code === UNIQUE_VIOLATION
      ) {
        const detail = (error.driverError as { detail?: string }).detail ?? '';
        if (detail.includes('(code)')) return null;
        throw new ConflictException('El usuario ya tiene una membresía');
      }
      throw error;
    }
  }
}
