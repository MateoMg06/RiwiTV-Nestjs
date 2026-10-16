import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { ShowtimeService } from './showtime.service.js';

@Controller('functions')
export class FunctionsController {
  constructor(private readonly showtimeService: ShowtimeService) {}

  @Get(':id')
  @Public()
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.showtimeService.getById(id);
  }

  @Get(':id/prices')
  @Public()
  getPrices(@Param('id', ParseIntPipe) id: number) {
    return this.showtimeService.getPrices(id);
  }
}
