import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  catch(exception: Error, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<FastifyReply>();
    const request = http.getRequest<FastifyRequest>();
    const InternalServerErrorCode = 500;
    if (response.sent) return;
    const requestId = request.id;
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= InternalServerErrorCode) {
        this.logger.error(
          {
            err: exception,
            requestId,
            status,
            method: request.method,
            url: request.url,
          },
          'HTTP server exception',
        );
      }
      response.status(status).send(exception.getResponse());
      return;
    }
    this.logger.error(
      {
        err: exception,
        requestId: request.id,
        method: request.method,
        url: request.url,
      },
      'Unhandled exception',
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}
