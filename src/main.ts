// Primero: varios modulos leen process.env al importarse.
import './config/load-env.js';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule, ObserveInstrument } from './app.module.js';
import { swaggerConfiguration } from './config/swagger.js';
import { corsOptions } from './config/cors.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  app.setGlobalPrefix('api');

  app.use(helmet());
  app.enableCors(corsOptions);
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  swaggerConfiguration(app);

  await app.listen(AppModule.appPort);
  console.log(`🚀 Application running on port ${AppModule.appPort}`);
  console.log(`📚 Swagger docs available at http://localhost:${AppModule.appPort}/api/docs`);
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
