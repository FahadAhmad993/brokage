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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { DisplayService } from '../display/display.service';

class RejectDisplayPostDto {
  @ApiProperty({
    required: false,
    description: 'Shown to the user as the reason their post was declined.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * Display post review queue — same verify/reject/remove workflow as
 * `AdminCommunityPostsController`, kept as its own controller/table since
 * Display is a separate product from the Community feed.
 */
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiTags('Admin / Display')
@ApiBearerAuth('bearer')
@Controller('admin/display-posts')
export class AdminDisplayPostsController {
  constructor(private readonly displayService: DisplayService) {}

  @ApiOperation({ summary: 'List every submitted Display post, any status' })
  @Get()
  list() {
    return this.displayService.findAllForAdmin();
  }

  @ApiOperation({
    summary:
      'Verify (approve) a pending post — goes live immediately for its chosen duration',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @Patch(':id/verify')
  verify(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.displayService.verify(id);
  }

  @ApiOperation({ summary: 'Reject a pending post, optionally with a reason' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: RejectDisplayPostDto })
  @Patch(':id/reject')
  reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RejectDisplayPostDto,
  ) {
    return this.displayService.reject(id, dto.reason);
  }

  @ApiOperation({
    summary: 'Pull a post down immediately (abuse, mistake, etc.)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.displayService.adminRemove(id);
  }
}
