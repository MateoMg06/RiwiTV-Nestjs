import { Injectable, NotFoundException } from '@nestjs/common';
import { UserDao } from '../user/user.dao.js';
import { User } from '../user/user.entity.js';
import { MembershipService } from '../membership/membership.service.js';
import { MembershipLevel, MembershipStatus } from '../../common/enums/domain.enums.js';

export interface ProfileResponse {
  id: number;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  documentType: string;
  documentNumber: string;
  birthDate: Date;
  gender: string | null;
  cityId: number | null;
  favoriteCinemaId: number | null;
  photoUrl: string | null;
  preferences: { acceptsNotifications: boolean };
  membership: { code: string; level: MembershipLevel; status: MembershipStatus } | null;
  /** Provisional: no existen compras ni reservas todavía (HU-010 / fuera de alcance). */
  purchaseHistory: never[];
  activeReservations: never[];
}

@Injectable()
export class ProfileService {
  constructor(
    private readonly userDao: UserDao,
    private readonly membershipService: MembershipService,
  ) {}

  /** `GET /profile`. Proyecta campo a campo: nunca password, rol, tokens ni bloqueo. */
  async get(userId: number): Promise<ProfileResponse> {
    const user = await this.userDao.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.toProfile(user);
  }

  private async toProfile(user: User): Promise<ProfileResponse> {
    const membership = await this.membershipService.findByUserId(user.id);
    return {
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      documentType: user.documentType,
      documentNumber: user.documentNumber,
      birthDate: user.birthDate,
      gender: user.gender,
      cityId: user.cityId,
      favoriteCinemaId: user.favoriteCinemaId,
      photoUrl: user.photoUrl,
      preferences: { acceptsNotifications: user.acceptsNotifications },
      membership: membership
        ? { code: membership.code, level: membership.level, status: membership.status }
        : null,
      purchaseHistory: [],
      activeReservations: [],
    };
  }
}
