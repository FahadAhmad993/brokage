import { Controller, Delete, HttpCode, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { ChatsService } from '../chats/chats.service';

/**
 * Manual, permanent chat-cleanup actions for the admin panel. Both routes
 * hard-delete rows from Postgres (not a UI-only hide) but never touch user
 * accounts/profiles or the thread rows themselves — so communities keep
 * existing (just empty) and any two users can still message each other
 * afterwards. The automatic day-based cleanup lives in
 * `ChatRetentionService` / `PATCH /admin/settings { chatRetentionDays }`.
 */
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiTags('Admin / Chats')
@ApiBearerAuth('bearer')
@Controller('admin/chats')
export class AdminChatsController {
  constructor(private readonly chatsService: ChatsService) {}

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
