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
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiAuth } from '../../common/decorators/api-auth.decorator.js';

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

@ApiTags('usuarios')
@ApiAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Alta administrativa. El registro publico es `POST /auth/register`, que
   * exige captcha y genera el token de activacion; abrir este endpoint
   * permitiria saltarse ambos.
   */
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Crear un usuario (admin)',
    description:
      'CRUD interno, sin historia. Solo `ADMIN`. El registro público es `POST /auth/register`.',
  })
  @ApiCreatedResponse({ description: 'Usuario creado.' })
  @ApiBadRequestResponse({ description: 'Datos inválidos.' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN.' })
  @ApiConflictResponse({ description: 'El correo o el documento ya están registrados.' })
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Listar usuarios (admin)',
    description: 'CRUD interno, sin historia. Solo `ADMIN`.',
  })
  @ApiOkResponse({ description: 'Lista de usuarios.' })
  @ApiForbiddenResponse({ description: 'Se requiere rol ADMIN.' })
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.USUARIO)
  @ApiOperation({
    summary: 'Consultar un usuario',
    description: 'CRUD interno, sin historia. El propio usuario o `ADMIN`.',
  })
  @ApiOkResponse({ description: 'Usuario.' })
  @ApiBadRequestResponse({ description: 'El id no es numérico.' })
  @ApiForbiddenResponse({ description: 'No puedes acceder a perfiles de otros usuarios.' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    ensureOwnOrAdmin(getRequester(request), id);
    return this.userService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.USUARIO)
  @ApiOperation({
    summary: 'Actualizar un usuario',
    description:
      'CRUD interno, sin historia. El propio usuario o `ADMIN`. El rol y `cityId` no se aceptan.',
  })
  @ApiOkResponse({ description: 'Usuario actualizado.' })
  @ApiBadRequestResponse({ description: 'Datos inválidos.' })
  @ApiForbiddenResponse({ description: 'No puedes acceder a perfiles de otros usuarios.' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  @ApiConflictResponse({ description: 'El correo ya está en uso.' })
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
  @ApiOperation({
    summary: 'Eliminar un usuario',
    description: 'CRUD interno, sin historia. El propio usuario o `ADMIN`.',
  })
  @ApiOkResponse({ description: 'Usuario eliminado, sin cuerpo.' })
  @ApiBadRequestResponse({ description: 'El id no es numérico.' })
  @ApiForbiddenResponse({ description: 'No puedes acceder a perfiles de otros usuarios.' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    ensureOwnOrAdmin(getRequester(request), id);
    return this.userService.remove(id);
  }
}
