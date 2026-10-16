import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database.js';
import { CountryModule } from './modules/country/country.module.js';
import { UtilsModule } from './common/utils/utils.module.js';
import { ConfigModule } from './config/config.module.js';
import { ConfigService } from './config/config.service.js';
import { Config } from './config/config.keys.js';
import { AuthGuard } from './common/guards/auth.guard.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UserModule } from './modules/user/user.module.js';
import { ProfileModule } from './modules/profile/profile.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ReservationModule } from './modules/reservation/reservation.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ObserveModule.forRoot({
      appKey: process.env.OBSERVER_APP_KEY ?? 'dev-app-key',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'dev-app-secret',
      serviceId: 'riwi-tv-nestjs',
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    CountryModule,
    UserModule,
    AuthModule,
    ProfileModule,
    HealthModule,
    ReservationModule,
    UtilsModule,
    ConfigModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {
  static appPort: number | string

  constructor(private readonly _configService: ConfigService){
    AppModule.appPort= this._configService.get(Config.APP_PORT)
  }
}
