import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CreateUserDto } from './create-user.dto.js';
import { UpdateUserDto } from './update-user.dto.js';
import { UserDao } from './user.dao.js';
import { User } from './user.entity.js';
import { Bcrypt } from '../../common/utils/bcrypt.js';
import { UserRole } from '../../common/enums/domain.enums.js';
import { Password } from '../../common/utils/password.js';
import { CityDao } from '../country/city/city.dao.js';
import { CinemaDao } from '../cinema/cinema.dao.js';

@Injectable()
export class UserService {
  private readonly saltRounds: number = Number(process.env.SALT_ROUNDS ?? 10);

  constructor(
    private readonly userDao: UserDao,
    private readonly bcrypt: Bcrypt,
    private readonly password: Password,
    private readonly cityDao: CityDao,
    private readonly cinemaDao: CinemaDao,
  ) {}

  findAll(): Promise<User[]> {
    return this.userDao.findAll();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userDao.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  /**
   * `manager` une el alta a la transacción del registro (HU-006). `extra` permite fijar
   * en la misma inserción el token de activación, sin un UPDATE posterior.
   */
  async create(
    dto: CreateUserDto,
    manager?: EntityManager,
    extra?: Pick<Partial<User>, 'activationToken' | 'activationTokenExpires'>,
  ): Promise<User> {
    await this.assertEmailIsFree(dto.email);

    const isValidPassword = await this.password.validatePassword(dto.password);

    if (!isValidPassword) {
      throw new BadRequestException('La contraseña no cumple con los parámetros requeridos');
    }

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Contraseñas no coinciden');
    }

    if (dto.email !== dto.confirmEmail) {
      throw new BadRequestException('Correos no coinciden');
    }

    // Los consentimientos se validan antes de tocar la base de datos. Guardar
    // el usuario y despues fallar dejaria un registro sin consentimiento
    // valido, que es exactamente lo que la norma de datos prohibe.
    if (!dto.acceptsDataProcessing) {
      throw new BadRequestException('Debe aceptar el procesamiento de datos para continuar');
    }
    if (!dto.acceptsTerms) {
      throw new BadRequestException('Debe aceptar los términos y condiciones para continuar');
    }

    const usedDocument = await this.userDao.findByDocumentNumber(dto.documentNumber);
    if (usedDocument) {
      throw new ConflictException('El documento ya está registrado');
    }

    // DECISION DE DISENO: `UserService.create()` NUNCA acepta un rol del
    // cliente, ni siquiera si el DTO lo trae. Anti-escalada de privilegios en
    // profundidad: proteger solo el endpoint publico (/auth/register) deja la
    // puerta abierta en cuanto alguien reutilice este servicio desde otro
    // controller o desde un script.
    // Los campos de confirmacion tampoco existen en la entidad.
    const {
      confirmEmail: _confirmEmail,
      confirmPassword: _confirmPassword,
      role: _role,
      password,
      ...data
    } = dto;

    return this.userDao.create(
      {
        ...data,
        ...extra,
        password: await this.bcrypt.hashPassword(password, this.saltRounds),
        role: UserRole.USUARIO,
      },
      manager,
    );
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (dto.email) {
      const exists = await this.userDao.findByEmail(dto.email);
      if (exists && exists.id !== id) {
        throw new ConflictException('Email en uso');
      }
      if (dto.confirmEmail && dto.email !== dto.confirmEmail) {
        throw new BadRequestException('Correos no coinciden');
      }
    }

    if (dto.password) {
      const isValidPassword = await this.password.validatePassword(dto.password);

      if (!isValidPassword) {
        throw new BadRequestException('La contraseña no cumple con los parámetros requeridos');
      }
      if (!dto.confirmPassword) {
        throw new BadRequestException('Debe confirmar la contraseña');
      }
      if (dto.password !== dto.confirmPassword) {
        throw new BadRequestException('Contraseñas no coinciden');
      }
    }

    // Por la misma razon que en create(): un usuario no se auto-promueve.
    // La promocion de rol es una operacion administrativa explicita y separada.
    const {
      confirmEmail: _confirmEmail,
      confirmPassword: _confirmPassword,
      role: _role,
      password,
      ...rest
    } = dto;

    const data: Partial<User> = { ...rest };

    if (password) {
      data.password = await this.bcrypt.hashPassword(password, this.saltRounds);
    }

    const updated = await this.userDao.update(id, data);
    return updated ?? user;
  }

  /**
   * HU-002: fija la ciudad del usuario. Es la única vía para cambiarla
   * (`UpdateUserDto` no acepta `cityId`), así RN-006 no se puede saltar.
   */
  async setLocation(userId: number, cityId: number): Promise<User> {
    const user = await this.findOne(userId);

    const city = await this.cityDao.findById(cityId);
    if (!city) throw new NotFoundException('Ciudad no encontrada');
    if (!city.isActive) throw new UnprocessableEntityException('La ciudad está inactiva');

    // RN-006: solo se puede elegir una ciudad con al menos un cine activo.
    if ((await this.cinemaDao.countActiveByCityId(cityId)) === 0) {
      throw new UnprocessableEntityException('La ciudad no tiene cines activos');
    }

    const updated = await this.userDao.update(userId, { cityId });
    return updated ?? user;
  }

  async remove(id: number): Promise<void> {
    const deleted = await this.userDao.delete(id);
    if (!deleted) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }

  private async assertEmailIsFree(email: string): Promise<void> {
    const used = await this.userDao.findByEmail(email);
    if (used) {
      throw new ConflictException('El correo ya está registrado');
    }
  }
}
