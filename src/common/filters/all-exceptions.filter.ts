import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  path: string;
  timestamp: string;
}

@Catch() // sin argumentos: atrapa TODO tipo de excepción
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // HttpAdapterHost evita acoplarse a Express (funciona igual con Fastify)
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const isHttpException = exception instanceof HttpException;

    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // En errores inesperados nunca se expone el detalle interno al cliente
    const message = isHttpException
      ? this.extractMessage(exception)
      : 'Internal server error';

    this.logException(exception, status, httpAdapter.getRequestMethod(request), httpAdapter.getRequestUrl(request));

    const body: ErrorResponseBody = {
      statusCode: status,
      message,
      path: httpAdapter.getRequestUrl(request),
      timestamp: new Date().toISOString(),
    };

    httpAdapter.reply(response, body, status);
  }

  /**
   * getResponse() puede devolver un string o un objeto { statusCode, message, error }.
   * Con ValidationPipe, `message` es un array de strings.
   */
  private extractMessage(exception: HttpException): string | string[] {
    const res = exception.getResponse();

    if (typeof res === 'string') return res;

    const { message } = res as { message?: string | string[] };
    return message ?? exception.message;
  }

  private logException(
    exception: unknown,
    status: number,
    method: string,
    url: string,
  ): void {
    const context = `${method} ${url}`;

    if (status >= 500) {
      // Errores del servidor: log completo con stack
      this.logger.error(
        context,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      // Errores del cliente (4xx): basta un warning
      this.logger.warn(`${context} -> ${status}`);
    }
  }
}