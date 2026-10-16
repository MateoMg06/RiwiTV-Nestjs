import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { EntityManager } from 'typeorm';
import { MembershipDao } from './membership.dao.js';
import { Membership } from './membership.entity.js';
import { MembershipStatus } from '../../common/enums/domain.enums.js';

/** Intentos para generar un código sin colisión antes de rendirse. */
const MAX_CODE_ATTEMPTS = 3;

@Injectable()
export class MembershipService {
  constructor(private readonly membershipDao: MembershipDao) {}

  /** `POST /membership/create`: 409 si el usuario ya tiene membresía. */
  async create(userId: number): Promise<Membership> {
    if (await this.membershipDao.findByUserId(userId)) {
      throw new ConflictException('El usuario ya tiene una membresía');
    }
    return this.createForUser(userId);
  }

  /**
   * Crea la membresía `ACTIVE` del usuario con un código único `RTV-XXXXXXXXXX` (RN de HU-006).
   * Con `manager` se une a la transacción del registro.
   */
  async createForUser(userId: number, manager?: EntityManager): Promise<Membership> {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = `RTV-${randomBytes(5).toString('hex').toUpperCase()}`;
      const membership = await this.membershipDao.create(
        { userId, code, status: MembershipStatus.ACTIVE },
        manager,
      );
      if (membership) return membership;
    }
    throw new InternalServerErrorException('No se pudo generar un código de membresía único');
  }
}
