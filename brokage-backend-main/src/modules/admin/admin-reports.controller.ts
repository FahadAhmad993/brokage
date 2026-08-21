import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { ModerationService } from '../moderation/moderation.service';

const STATUSES = ['reviewed', 'actioned', 'dismissed'] as const;

class SetReportStatusDto {
  @ApiProperty({ enum: STATUSES })
  @IsIn(STATUSES)
  status!: (typeof STATUSES)[number];
}

/**
 * Report review queue: shows who reported whom, why (reason + optional
 * custom message), and lets the admin mark it reviewed/actioned/dismissed.
 * Blocking/disabling either the reporter or the reported user happens via
 * the existing `admin/users/:id/block` and `admin/users/:id/disable`
 * endpoints — the admin panel calls those with the ids shown here.
 */
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiTags('Admin / Reports')
@ApiBearerAuth('bearer')
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly moderationService: ModerationService) {}

  @ApiOperation({ summary: 'List every report, with reporter + reported-user info resolved' })
  @Get()
  list() {
    return this.moderationService.listReportsForAdmin();
  }

  @ApiOperation({ summary: 'Mark a report reviewed / actioned / dismissed' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: SetReportStatusDto })
  @Patch(':id/status')
  setStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetReportStatusDto,
  ) {
    return this.moderationService.setReportStatus(id, dto.status);
  }
}
