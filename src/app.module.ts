import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
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

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'riwi-tv-nestjs',
    }),
    DatabaseModule,
    CountryModule,
    UserModule,
    AuthModule,
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
