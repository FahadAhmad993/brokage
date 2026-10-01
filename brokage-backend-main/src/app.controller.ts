import { Controller, Get, Logger } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ApiCommonErrorResponses,
  ApiEnvelopeResponse,
} from './common/swagger/api-envelope.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * This is the route the keep-alive cron hits every 8-10 minutes. It used
   * to be a pure in-memory response — it kept the Render Node process
   * awake, but did nothing for Supabase: no query meant no warm pooler
   * connection on the Supabase side, and no protection against whatever
   * Supabase does to an idle/free-tier project. A cheap `SELECT 1` here
   * makes the same cron ping actually exercise the DB connection too.
   * Any DB error is swallowed (and logged) so a transient DB hiccup never
   * turns the health check itself into an outage for the cron/uptime monitor.
   */
  @ApiOperation({ summary: 'Backend health endpoint' })
  @ApiEnvelopeResponse({ description: 'Service health fetched successfully' })
  @ApiCommonErrorResponses()
  @Get()
  async getHealth() {
    let db: 'ok' | 'error' = 'ok';
    try {
      await this.dataSource.query('SELECT 1');
    } catch (err) {
      db = 'error';
      this.logger.warn(
        `Health check DB ping failed: ${err instanceof Error ? err.message : err}`,
      );
    }
    return { status: 'ok', service: 'sanctuary-backend', db };
  }
}
