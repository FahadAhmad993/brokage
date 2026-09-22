import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { ChatsService } from '../chats/chats.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/**
 * Manual, permanent chat-cleanup actions for the admin panel. Both routes
 * hard-delete rows from Postgres (not a UI-only hide) but never touch user
 * accounts/profiles or the thread rows themselves — so communities keep
 * existing (just empty) and any two users can still message each other
 * afterwards. The automatic day-based cleanup lives in
 * `ChatRetentionService` / `PATCH /admin/settings { chatRetentionDays }`.
 *
 * Also exposes read-only chat oversight: browsing every direct (1-to-1)
 * conversation platform-wide and reading a specific thread's full,
 * unfiltered message history — for moderation/dispute review.
 */
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiTags('Admin / Chats')
@ApiBearerAuth('bearer')
@Controller('admin/chats')
export class AdminChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @ApiOperation({
    summary:
      'List every direct (1-to-1) chat thread platform-wide, with both participants and a last-message preview. Optional `search` matches a participant name/email.',
  })
  @Get('threads')
  listDirectThreads(@Query() query: PaginationQueryDto) {
    return this.chatsService.adminListDirectThreads(query);
  }

  @ApiOperation({
    summary:
      "Full, unfiltered message history for one thread — ignores any participant's own clear/block state, for moderation review.",
  })
  @Get('threads/:id/messages')
  listThreadMessages(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.chatsService.adminListThreadMessages(id, query);
  }

  @ApiOperation({
    summary:
      'Permanently delete every message in every community (group) chat. Communities themselves and user profiles are kept.',
  })
  @HttpCode(200)
  @Delete('community')
  deleteAllCommunityMessages() {
    return this.chatsService.adminDeleteAllCommunityMessages();
  }

  @ApiOperation({
    summary:
      "Permanently delete every message in every user's private (direct) chats. Threads and user profiles are kept so users can message each other again.",
  })
  @HttpCode(200)
  @Delete('private')
  deleteAllPrivateMessages() {
    return this.chatsService.adminDeleteAllPrivateMessages();
  }
}
