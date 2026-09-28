import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './create-user.dto.js';
import { UpdateUserDto } from './update-user.dto.js';
import { UserDao } from './user.dao.js';
import { User } from './user.entity.js';

@Injectable()
export class UserService {
  constructor(private readonly userDao: UserDao) {}

  findAll(): Promise<User[]> {
    return this.userDao.findAll();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userDao.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const usedEmail = await this.userDao.findByEmail(dto.email);
    if (usedEmail) throw new ConflictException('El usuario ya existe');

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Contraseñas no coinciden');
    }
    if (dto.email !== dto.confirmEmail) {
      throw new BadRequestException('Correos no coinciden');
    }

    if (!dto.acceptsDataProcessing) {
      throw new BadRequestException(
        'Debe aceptar el procesamiento de datos para continuar',
      );
    }
    if (!dto.acceptsTerms) {
      throw new BadRequestException(
        'Debe aceptar los términos y condiciones para continuar',
      );
    }

    const city = await this.userDao.findCityByName(dto.city);
    if (!city) {
      throw new NotFoundException(`City with name "${dto.city}" not found`);
    }

    const { confirmEmail, confirmPassword, city: _cityName, ...data } = dto;

    return this.userDao.create({ ...data, city });
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
      if (!dto.confirmPassword) {
        throw new BadRequestException('Debe confirmar la contraseña');
      }
      if (dto.password !== dto.confirmPassword) {
        throw new BadRequestException('Contraseñas no coinciden');
      }
    }

    const { confirmEmail, confirmPassword, city: cityName, ...rest } = dto;
    const data: Partial<User> = { ...rest };

    if (cityName) {
      const city = await this.userDao.findCityByName(cityName);
      if (!city) {
        throw new NotFoundException(`City with name "${cityName}" not found`);
      }
      data.city = city;
    }

    const updated = await this.userDao.update(id, data);
    return updated ?? user;
  }

  async remove(id: number): Promise<void> {
    const deleted = await this.userDao.delete(id);
    if (!deleted) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }
}
