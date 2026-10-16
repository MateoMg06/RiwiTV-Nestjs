import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { Public } from './common/decorators/public.decorator.js';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({
    summary: 'Ruta raíz',
    description: 'Devuelve un texto fijo; sirve para comprobar que la aplicación responde.',
  })
  @ApiOkResponse({ description: 'Texto de bienvenida.' })
  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }
}
