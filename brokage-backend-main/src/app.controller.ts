import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiCommonErrorResponses,
  ApiEnvelopeResponse,
} from './common/swagger/api-envelope.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  @ApiOperation({ summary: 'Backend health endpoint' })
  @ApiEnvelopeResponse({ description: 'Service health fetched successfully' })
  @ApiCommonErrorResponses()
  @Get()
  getHealth() {
    return { status: 'ok', service: 'sanctuary-backend' };
  }
}
