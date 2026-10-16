import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { ReservationService } from './reservation.service.js';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

/**
 * Mapa de sillas (HU-010). Comparte el prefijo `functions` con `FunctionsController` (HU-009),
 * pero `:id/seats` tiene un segmento más que `:id`, así que las rutas no se tapan entre sí.
 */
@ApiTags('funciones')
@Controller('functions')
export class SeatsController {
  constructor(private readonly reservationService: ReservationService) {}

  @ApiOperation({
    summary: 'Mapa de sillas de una función',
    description:
      'HU-010. Público. Una silla bloqueada cuyo plazo venció se muestra como disponible.',
  })
  @ApiOkResponse({ description: 'Sillas con su estado.' })
  @ApiBadRequestResponse({ description: 'El id no es numérico.' })
  @ApiNotFoundResponse({ description: 'La función no existe o no está disponible.' })
  @Get(':id/seats')
  @Public()
  getSeatMap(@Param('id', ParseIntPipe) id: number) {
    return this.reservationService.getSeatMap(id);
  }
}
