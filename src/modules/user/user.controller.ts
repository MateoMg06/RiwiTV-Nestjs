import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  ForbiddenException,
  ParseIntPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserService } from './user.service.js';
import { CreateUserDto } from './create-user.dto.js';
import { UpdateUserDto } from './update-user.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/enums/domain.enums.js';

interface Requester {
  id: number;
  role: string;
}

function getRequester(request: Request): Requester | null {
  const user = (request as unknown as { user?: Requester }).user;
  if (!user || typeof user.id !== 'number' || typeof user.role !== 'string') {
    return null;
  }
  return user;
}

function ensureOwnOrAdmin(requester: Requester | null, targetId: number): void {
  if (!requester) {
    throw new ForbiddenException('Token invalido o expirado');
  }
  if (requester.role !== UserRole.ADMIN && requester.id !== targetId) {
    throw new ForbiddenException('No puedes acceder a perfiles de otros usuarios');
  }
}

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Alta administrativa. El registro publico es `POST /auth/register`, que
   * exige captcha y genera el token de activacion; abrir este endpoint
   * permitiria saltarse ambos.
   */
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.USUARIO)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    ensureOwnOrAdmin(getRequester(request), id);
    return this.userService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.USUARIO)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: Request,
  ) {
    ensureOwnOrAdmin(getRequester(request), id);
    return this.userService.update(id, updateUserDto);
  }

  @Roles(UserRole.ADMIN, UserRole.USUARIO)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    ensureOwnOrAdmin(getRequester(request), id);
    return this.userService.remove(id);
  }
}
