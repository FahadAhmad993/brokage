import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

type SuccessOptions = {
  status?: number;
  description: string;
  messageExample?: string;
  dataExample?: unknown;
};

export function ApiEnvelopeResponse(options: SuccessOptions) {
  const status = options.status ?? HttpStatus.OK;
  return applyDecorators(
    ApiResponse({
      status,
      description: options.description,
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: status },
          message: {
            type: 'string',
            example: options.messageExample ?? 'Request successful',
          },
          data: {
            type: 'object',
            example: options.dataExample ?? {},
          },
          timestamp: { type: 'string', format: 'date-time' },
          path: { type: 'string', example: '/api/v1/example' },
        },
      },
    }),
  );
}

export function ApiCommonErrorResponses() {
  const errorSchema = {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      statusCode: { type: 'number', example: 400 },
      message: { type: 'string', example: 'Validation failed' },
      errors: {
        oneOf: [
          { type: 'array', items: { type: 'string' } },
          { type: 'object', additionalProperties: true },
        ],
      },
      timestamp: { type: 'string', format: 'date-time' },
      path: { type: 'string', example: '/api/v1/example' },
    },
  };

  return applyDecorators(
    ApiBadRequestResponse({ schema: errorSchema }),
    ApiUnauthorizedResponse({
      schema: {
        ...errorSchema,
        properties: {
          ...errorSchema.properties,
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
    ApiInternalServerErrorResponse({
      schema: {
        ...errorSchema,
        properties: {
          ...errorSchema.properties,
          statusCode: { type: 'number', example: 500 },
          message: { type: 'string', example: 'Internal server error' },
        },
      },
    }),
  );
}
