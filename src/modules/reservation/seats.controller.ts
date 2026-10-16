import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { ReservationService } from './reservation.service.js';

/**
 * Mapa de sillas (HU-010). Comparte el prefijo `functions` con `FunctionsController` (HU-009),
 * pero `:id/seats` tiene un segmento más que `:id`, así que las rutas no se tapan entre sí.
 */
@Controller('functions')
export class SeatsController {
  constructor(private readonly reservationService: ReservationService) {}

  @Get(':id/seats')
  @Public()
  getSeatMap(@Param('id', ParseIntPipe) id: number) {
    return this.reservationService.getSeatMap(id);
  }
}
