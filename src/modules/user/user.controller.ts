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
} from '@nestjs/common';
import type { Request } from 'express';
import { UserService } from './user.service.js';
import { CreateUserDto } from './create-user.dto.js';
import { UpdateUserDto } from './update-user.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
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

  @Public()
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Roles("admin")
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Roles("admin", "usuario")
  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: Request) {
    ensureOwnOrAdmin(getRequester(request), +id);
    return this.userService.findOne(+id);
  }

  @Roles("admin", "usuario")
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() request: Request) {
    ensureOwnOrAdmin(getRequester(request), +id);
    return this.userService.update(+id, updateUserDto);
  }

  @Roles("admin", "usuario")
  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: Request) {
    ensureOwnOrAdmin(getRequester(request), +id);
    return this.userService.remove(+id);
  }
}