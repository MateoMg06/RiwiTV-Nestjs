import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database.js';
import { CountryModule } from './modules/country/country.module.js';
import { UtilsModule } from './common/utils/utils.module.js';
import { ErrorModule } from './error/error.module.js';
import { ConfigModule } from './config/config.module.js';
import { ConfigService } from './config/config.service.js';
import { Config } from './config/config.keys.js';

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
    DatabaseModule,
    CountryModule,
    UtilsModule,
    ErrorModule,
    ConfigModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  static appPort: number | string

  constructor(private readonly _configService: ConfigService){
    AppModule.appPort= this._configService.get(Config.APP_PORT)
  }
}
