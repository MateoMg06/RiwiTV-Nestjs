import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { ShowtimeService } from './showtime.service.js';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('funciones')
@Controller('functions')
export class FunctionsController {
  constructor(private readonly showtimeService: ShowtimeService) {}

  @ApiOperation({
    summary: 'Detalle de una función',
    description:
      'HU-009 / RN-035. Público. Solo funciones futuras y no canceladas de película y cine activos.',
  })
  @ApiOkResponse({
    description:
      'Función con película resumida, cine, formato, idioma, audio, sala, estado y precio.',
  })
  @ApiBadRequestResponse({ description: 'El id no es numérico.' })
  @ApiNotFoundResponse({ description: 'La función no existe o no está disponible.' })
  @Get(':id')
  @Public()
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.showtimeService.getById(id);
  }

  @ApiOperation({
    summary: 'Precio de una función',
    description: 'HU-009 / RN-037 / RN-038. Público. Precio de lista calculado en cada petición.',
  })
  @ApiOkResponse({ description: '`{ functionId, format, roomType, startsAt, status, price }`.' })
  @ApiBadRequestResponse({ description: 'El id no es numérico.' })
  @ApiNotFoundResponse({ description: 'La función no existe o no está disponible.' })
  @Get(':id/prices')
  @Public()
  getPrices(@Param('id', ParseIntPipe) id: number) {
    return this.showtimeService.getPrices(id);
  }
}
