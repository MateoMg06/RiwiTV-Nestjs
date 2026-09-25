import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule, ObserveInstrument } from './app.module.js';
import { swaggerConfiguration } from './config/swagger.js';
import { corsOptions } from './config/cors.js';
import { validateEnvironment } from './config/enviroment.js';

async function bootstrap() {
  validateEnvironment();

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

  const port = process.env.APP_PORT ?? process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Application running on port ${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
}

await bootstrap();