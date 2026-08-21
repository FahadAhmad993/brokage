import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorPayload = {
  success: false;
  statusCode: number;
  message: string;
  errors?: string[] | Record<string, unknown>;
  timestamp: string;
  path: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const statusCode = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawResponse = isHttp ? exception.getResponse() : null;

    let message = 'Internal server error';
    let errors: string[] | Record<string, unknown> | undefined;

    if (typeof rawResponse === 'string') {
      message = rawResponse;
    } else if (rawResponse && typeof rawResponse === 'object') {
      const payload = rawResponse as {
        message?: string | string[];
        error?: string;
        errors?: string[] | Record<string, unknown>;
      };
      if (Array.isArray(payload.message)) {
        message = 'Validation failed';
        errors = payload.message;
      } else if (typeof payload.message === 'string') {
        message = payload.message;
      } else if (typeof payload.error === 'string') {
        message = payload.error;
      }
      if (payload.errors) {
        errors = payload.errors;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const body: ErrorPayload = {
      success: false,
      statusCode,
      message,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(body);
  }
}
