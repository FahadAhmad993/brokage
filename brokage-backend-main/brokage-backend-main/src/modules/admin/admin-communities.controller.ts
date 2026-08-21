import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { ChatsService } from '../chats/chats.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { DeleteCommunityDto } from './dto/delete-community.dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@ApiTags('Admin / Communities')
@ApiBearerAuth('bearer')
@Controller('admin/communities')
export class AdminCommunitiesController {
  constructor(private readonly chatsService: ChatsService) {}

  @ApiOperation({ summary: 'List every community (group chat)' })
  @Get()
  list() {
    return this.chatsService.listCommunities();
  }

  @ApiOperation({
    summary:
      'Communities still inside their 7-day restore window — "Recently deleted" list.',
  })
  @Get('deleted')
  listDeleted() {
    return this.chatsService.listDeletedCommunities();
  }

  @ApiOperation({
    summary:
      'Create a new community — a separate group chat scoped to its own members/messages',
  })
  @Post()
  create(@Body() dto: CreateCommunityDto) {
    return this.chatsService.createCommunity(dto.title);
  }

  @ApiOperation({
    summary:
      'Soft-delete a community. Restorable for 7 days — nothing is actually removed until the window passes.',
  })
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: DeleteCommunityDto) {
    return this.chatsService.deleteCommunity(id, dto?.reason);
  }

  @ApiOperation({
    summary: 'Restore a soft-deleted community while still inside its 7-day window.',
  })
  @Patch(':id/restore')
  restore(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.chatsService.restoreCommunity(id);
  }
}

