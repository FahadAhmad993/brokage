import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CommunityPostsService } from '../community-posts/community-posts.service';

class RejectAdDto {
  @ApiProperty({ required: false, description: 'Shown to the user as the reason their ad was declined.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * Ad review queue: an admin sees every submitted ad (pending/active/expired/
 * rejected) with all its details — pictures, description, area, city, price —
 * and can Verify (goes live for `durationHours`) or Reject it.
 */
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiTags('Admin / Ads')
@ApiBearerAuth('bearer')
@Controller('admin/community-posts')
export class AdminCommunityPostsController {
  constructor(private readonly communityPostsService: CommunityPostsService) {}

  @ApiOperation({ summary: 'List every submitted community ad/post, any status' })
  @Get()
  list() {
    return this.communityPostsService.findAllForAdmin();
  }

  @ApiOperation({ summary: 'Verify (approve) a pending ad — goes live immediately for its chosen duration' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @Patch(':id/verify')
  verify(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.communityPostsService.verify(id);
  }

  @ApiOperation({ summary: 'Reject a pending ad, optionally with a reason' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: RejectAdDto })
  @Patch(':id/reject')
  reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RejectAdDto,
  ) {
    return this.communityPostsService.reject(id, dto.reason);
  }

  @ApiOperation({ summary: 'Pull an ad down immediately (abuse, mistake, etc.)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.communityPostsService.remove(id);
  }
}
