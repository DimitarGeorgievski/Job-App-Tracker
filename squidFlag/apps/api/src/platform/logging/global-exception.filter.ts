import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { PinoLogger } from 'nestjs-pino';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }
  catch(exception: Error, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    if (response.sent) return;
    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).send(exception.getResponse());
      return;
    }
    this.logger.error(exception, 'Unhandled exception');
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}
