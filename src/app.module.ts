import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PaisModule } from './country/pais.module';
import { DepartmentService } from './country/department/department.service';
import { CityService } from './country/city/city.service';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'riwi-tv-nestjs',
    }),
    PaisModule,
  ],
  controllers: [AppController],
  providers: [AppService, DepartmentService, CityService],
})
export class AppModule {}
