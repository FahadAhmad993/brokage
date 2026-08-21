import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { ModerationService } from './moderation.service';
import { BlockUserDto } from './dto/block-user.dto';
import { CreateReportDto } from './dto/create-report.dto';
import {
  ApiCommonErrorResponses,
  ApiEnvelopeResponse,
} from '../../common/swagger/api-envelope.decorator';

@UseGuards(JwtAuthGuard)
@ApiTags('Moderation')
@ApiBearerAuth('bearer')
@Controller()
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @ApiOperation({ summary: 'Block a user' })
  @ApiBody({ type: BlockUserDto })
  @ApiEnvelopeResponse({ description: 'User blocked successfully' })
  @ApiCommonErrorResponses()
  @HttpCode(200)
  @Post('users/me/blocks')
  blockUser(@CurrentUser() user: JwtPayload, @Body() dto: BlockUserDto) {
    return this.moderationService.blockUser(user.sub, dto.userId);
  }

  @ApiOperation({ summary: 'Unblock a previously blocked user' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiEnvelopeResponse({ description: 'User unblocked successfully' })
  @ApiCommonErrorResponses()
  @Delete('users/me/blocks/:userId')
  unblockUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.moderationService.unblockUser(user.sub, userId);
  }

  @ApiOperation({ summary: 'List users the current user has blocked' })
  @ApiEnvelopeResponse({ description: 'Blocked users fetched successfully' })
  @ApiCommonErrorResponses()
  @Get('users/me/blocks')
  listBlocked(@CurrentUser() user: JwtPayload) {
    return this.moderationService.listBlocked(user.sub);
  }

  @ApiOperation({ summary: 'Report objectionable content or a user' })
  @ApiBody({ type: CreateReportDto })
  @ApiEnvelopeResponse({
    status: 201,
    description: 'Report submitted successfully',
    messageExample: 'Resource created successfully',
  })
  @ApiCommonErrorResponses()
  @Post('reports')
  createReport(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateReportDto,
  ) {
    return this.moderationService.createReport(user.sub, dto);
  }
}
