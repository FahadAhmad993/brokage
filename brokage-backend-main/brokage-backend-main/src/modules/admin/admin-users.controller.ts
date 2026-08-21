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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { UsersService } from '../users/users.service';
import { CommunityPostsService } from '../community-posts/community-posts.service';
import { SetUserFlagDto } from './dto/set-user-flag.dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@ApiTags('Admin / Users')
@ApiBearerAuth('bearer')
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly communityPostsService: CommunityPostsService,
  ) {}

  @ApiOperation({ summary: 'List every registered user' })
  @Get()
  list() {
    return this.usersService.listAllForAdmin();
  }

  @ApiOperation({
    summary:
      "Full profile view for one user: name, phone, email, bio, avatar, account flags, and every ad they've ever posted.",
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @Get(':id')
  async detail(@Param('id', new ParseUUIDPipe()) id: string) {
    const [user, ads] = await Promise.all([
      this.usersService.getDetailForAdmin(id),
      this.communityPostsService.findAllForUser(id),
    ]);
    return { ...user, ads };
  }

  @ApiOperation({ summary: 'Block or unblock a user (optionally with a reason shown to the user)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @Patch(':id/block')
  setBlocked(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetUserFlagDto,
  ) {
    return this.usersService.setBlocked(id, dto.value, dto.reason);
  }

  @ApiOperation({ summary: 'Disable or re-enable a user (optionally with a reason shown to the user)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @Patch(':id/disable')
  setDisabled(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetUserFlagDto,
  ) {
    return this.usersService.setDisabled(id, dto.value, dto.reason);
  }

  @ApiOperation({ summary: 'Permanently delete a user and their data' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.adminDeleteUser(id);
  }
}
