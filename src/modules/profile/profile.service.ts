import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { UserDao } from '../user/user.dao.js';
import { User } from '../user/user.entity.js';
import { UpdateProfileDto } from './update-profile.dto.js';
import { UserService } from '../user/user.service.js';
import { MailService } from '../../common/utils/mail.js';
import { ACTIVATION_TTL_MS, hashToken } from '../../common/utils/token-hash.js';
import { MembershipService } from '../membership/membership.service.js';
import { MembershipLevel, MembershipStatus } from '../../common/enums/domain.enums.js';

export interface ProfileResponse {
  id: number;
  name: string;
  lastName: string;
  email: string;
  /** Correo nuevo a la espera de verificación (RN-034). */
  pendingEmail: string | null;
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
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly userDao: UserDao,
    private readonly userService: UserService,
    private readonly membershipService: MembershipService,
    private readonly mail: MailService,
  ) {}

  /** `GET /profile`. Proyecta campo a campo: nunca password, rol, tokens ni bloqueo. */
  async get(userId: number): Promise<ProfileResponse> {
    const user = await this.userDao.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.toProfile(user);
  }

  /**
   * `PUT /profile`: actualiza solo los campos editables que llegan (`undefined` = no tocar;
   * `photoUrl: null` quita la foto) y devuelve el perfil.
   *
   * RN-034: si `email` es otro, NO se cambia: se guarda en `pendingEmail` con un token de
   * verificación (SHA-256, 24 h) y se envía el correo al nuevo. `email`, `accountStatus` y las
   * sesiones quedan intactos hasta que `AuthService.activate` confirme el token.
   */
  async update(
    userId: number,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponse & { emailVerificationRequired?: true }> {
    const user = await this.userDao.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (dto.email !== undefined && dto.email !== dto.confirmEmail) {
      throw new BadRequestException('Correos no coinciden');
    }

    const data: Partial<User> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.photoUrl !== undefined) data.photoUrl = dto.photoUrl;
    if (dto.acceptsNotifications !== undefined) {
      data.acceptsNotifications = dto.acceptsNotifications;
    }

    let verificationToken: string | undefined;
    if (dto.email !== undefined && dto.email.toLowerCase() !== user.email.toLowerCase()) {
      await this.userService.assertEmailIsFree(dto.email);
      verificationToken = randomBytes(32).toString('hex');
      data.pendingEmail = dto.email;
      data.activationToken = hashToken(verificationToken);
      data.activationTokenExpires = new Date(Date.now() + ACTIVATION_TTL_MS);
    } else if (dto.email !== undefined && user.pendingEmail) {
      // Mismo correo que el actual: se cancela el cambio pendiente (la cuenta es ACTIVE,
      // el token de activación solo servía para ese cambio).
      data.pendingEmail = null;
      data.activationToken = null;
      data.activationTokenExpires = null;
    }

    if (Object.keys(data).length === 0) return this.toProfile(user);
    const updated = await this.userDao.update(userId, data);
    const profile = await this.toProfile(updated ?? user);
    if (!verificationToken || !dto.email) return profile;

    // Sin await: el tiempo de respuesta no depende del SMTP; un fallo solo se registra (sin token).
    this.mail.sendActivation(dto.email, user.name, verificationToken).catch((error: Error) => {
      this.logger.error(
        `No se pudo enviar el correo de verificación al usuario ${userId}: ${error.message}`,
      );
    });
    return { ...profile, emailVerificationRequired: true };
  }

  private async toProfile(user: User): Promise<ProfileResponse> {
    const membership = await this.membershipService.findByUserId(user.id);
    return {
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      pendingEmail: user.pendingEmail ?? null,
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
