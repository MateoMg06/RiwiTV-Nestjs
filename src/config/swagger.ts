import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { INestApplication, Logger } from "@nestjs/common";

const logger = new Logger('Swagger');

export const swaggerConfiguration = (app: INestApplication): void => {

    const config = new DocumentBuilder()
        .setTitle('Riwi TV API')
        .setDescription('API de autenticación y usuarios para la plataforma de cine RIWI TV. Incluye registro, activación de cuenta, login, refresh de tokens, logout y CRUD de usuarios.')
        .setVersion('1.0.0')
        .addTag('auth', 'Endpoints de autenticación: registro, activación, login, refresh, logout y consulta de perfil.')
        .addTag('user', 'Endpoints de usuarios: creación, listado, consulta, actualización y eliminación de perfiles.')
        .addBearerAuth()
        .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'API Key')
        .build()

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document)

    logger.log(`Docs available at http://localhost:${(app as any).getHttpServer()?.address()?.port ?? 3000}/api/docs`)
}