import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { EntityManager } from 'typeorm';
import { MembershipDao } from './membership.dao.js';
import { Membership } from './membership.entity.js';
import { MembershipLevel, MembershipStatus } from '../../common/enums/domain.enums.js';
import { type Benefit, benefitsFor, discountFor } from './membership-benefits.js';

/** Intentos para generar un código sin colisión antes de rendirse. */
const MAX_CODE_ATTEMPTS = 3;

@Injectable()
export class MembershipService {
  constructor(private readonly membershipDao: MembershipDao) {}

  /** Membresía del usuario (la usa el login de HU-007). */
  findByUserId(userId: number): Promise<Membership | null> {
    return this.membershipDao.findByUserId(userId);
  }

  private async getOrFail(userId: number): Promise<Membership> {
    const membership = await this.membershipDao.findByUserId(userId);
    if (!membership) throw new NotFoundException('El usuario no tiene membresía');
    return membership;
  }

  /** `GET /membership`: el QR es el propio código (el frontend dibuja la imagen). */
  async getMine(userId: number): Promise<{
    code: string;
    status: MembershipStatus;
    level: MembershipLevel;
    qr: { payload: string };
    createdAt: Date;
  }> {
    const { code, status, level, createdAt } = await this.getOrFail(userId);
    return { code, status, level, qr: { payload: code }, createdAt };
  }

  /** `GET /membership/benefits`. `bonuses` queda vacío: no existe billetera de bonos (HU-006). */
  async getBenefits(userId: number): Promise<{
    level: MembershipLevel;
    discountPercent: number;
    benefits: Benefit[];
    bonuses: never[];
  }> {
    const { level } = await this.getOrFail(userId);
    return {
      level,
      discountPercent: discountFor(level),
      benefits: benefitsFor(level),
      bonuses: [],
    };
  }

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
