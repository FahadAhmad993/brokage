import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatsService } from './chats.service';
import { ChatsGateway } from './chats.gateway';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { ListThreadQueryDto } from './dto/list-thread-query.dto';
import { ListMessageQueryDto } from './dto/list-message-query.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateThreadDto } from './dto/create-thread.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiCommonErrorResponses,
  ApiEnvelopeResponse,
} from '../../common/swagger/api-envelope.decorator';

@UseGuards(JwtAuthGuard)
@ApiTags('Chats')
@ApiBearerAuth('bearer')
@Controller('chats')
export class ChatsController {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly chatsGateway: ChatsGateway,
  ) {}

  @ApiOperation({ summary: 'List chat threads for current user' })
  @ApiEnvelopeResponse({ description: 'Threads fetched successfully' })
  @ApiCommonErrorResponses()
  @Get('threads')
  listThreads(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListThreadQueryDto,
  ) {
    return this.chatsService.listThreads(user.sub, query);
  }

  @ApiOperation({ summary: 'Create direct/group chat thread' })
  @ApiBody({ type: CreateThreadDto })
  @ApiEnvelopeResponse({
    status: 201,
    description: 'Thread created successfully',
    messageExample: 'Resource created successfully',
  })
  @ApiCommonErrorResponses()
  @Post('threads')
  createThread(@CurrentUser() user: JwtPayload, @Body() dto: CreateThreadDto) {
    return this.chatsService.createThread(user.sub, dto);
  }

  @ApiOperation({ summary: 'List messages in a thread' })
  @ApiParam({ name: 'threadId', format: 'uuid' })
  @ApiEnvelopeResponse({ description: 'Messages fetched successfully' })
  @ApiCommonErrorResponses()
  @Get('threads/:threadId/messages')
  listMessages(
    @CurrentUser() user: JwtPayload,
    @Param('threadId', new ParseUUIDPipe()) threadId: string,
    @Query() query: ListMessageQueryDto,
  ) {
    return this.chatsService.listMessages(user.sub, threadId, query);
  }

  @ApiOperation({ summary: 'Send message to a thread' })
  @ApiParam({ name: 'threadId', format: 'uuid' })
  @ApiBody({ type: SendMessageDto })
  @ApiEnvelopeResponse({
    status: 201,
    description: 'Message sent successfully',
    messageExample: 'Resource created successfully',
  })
  @ApiCommonErrorResponses()
  @Post('threads/:threadId/messages')
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param('threadId', new ParseUUIDPipe()) threadId: string,
    @Body() dto: SendMessageDto,
  ) {
    const saved = await this.chatsService.sendMessage(
      user.sub,
      threadId,
      dto.body,
      dto.clientId,
      dto.locationContext,
      dto.imageUrl,
      dto.communityPostContext,
      dto.replyToCommunityMessage,
      dto.replyToMessageId,
    );
    // Mirror the gateway's broadcast so REST-fallback sends still reach
    // every connected device in real time.
    await this.chatsGateway.broadcastNewMessage(saved);
    return saved;
  }

  @ApiOperation({
    summary:
      "Clear all messages for the current user only (peer's history is untouched)",
  })
  @ApiParam({ name: 'threadId', format: 'uuid' })
  @ApiEnvelopeResponse({ description: 'Thread cleared successfully' })
  @ApiCommonErrorResponses()
  @Post('threads/:threadId/clear')
  clearThread(
    @CurrentUser() user: JwtPayload,
    @Param('threadId', new ParseUUIDPipe()) threadId: string,
  ) {
    return this.chatsService.clearThreadForUser(user.sub, threadId);
  }

  @ApiOperation({
    summary:
      "Delete a chat from the current user's inbox only — other participants keep the thread untouched, and it reappears for this user if a new message arrives",
  })
  @ApiParam({ name: 'threadId', format: 'uuid' })
  @ApiEnvelopeResponse({
    description: 'Thread deleted from inbox successfully',
  })
  @ApiCommonErrorResponses()
  @HttpCode(200)
  @Delete('threads/:threadId')
  deleteThread(
    @CurrentUser() user: JwtPayload,
    @Param('threadId', new ParseUUIDPipe()) threadId: string,
  ) {
    return this.chatsService.hideThreadForUser(user.sub, threadId);
  }

  @ApiOperation({
    summary:
      'Delete a message — "me" hides it for the requester only, "everyone" (author-only) blanks it for all participants',
  })
  @ApiParam({ name: 'messageId', format: 'uuid' })
  @ApiParam({ name: 'scope', required: false })
  @ApiEnvelopeResponse({ description: 'Message deleted successfully' })
  @ApiCommonErrorResponses()
  @Delete('messages/:messageId')
  async deleteMessage(
    @CurrentUser() user: JwtPayload,
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @Query('scope') scope: 'me' | 'everyone' = 'me',
  ) {
    if (scope === 'everyone') {
      const result = await this.chatsService.deleteMessageForEveryone(
        user.sub,
        messageId,
      );
      await this.chatsGateway.broadcastMessageDeleted(
        result.threadId,
        messageId,
      );
      return result;
    }
    return this.chatsService.deleteMessageForMe(user.sub, messageId);
  }
}
