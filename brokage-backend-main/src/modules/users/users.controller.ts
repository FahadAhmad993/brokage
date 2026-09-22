import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
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
@ApiTags('Users')
@ApiBearerAuth('bearer')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiEnvelopeResponse({ description: 'Current user fetched successfully' })
  @ApiCommonErrorResponses()
  @Get('me')
  async me(@CurrentUser() user: JwtPayload) {
    const found = await this.usersService.findById(user.sub);
    if (!found) {
      return null;
    }
    return {
      id: found.id,
      email: found.email,
      displayName: found.displayName,
      avatarUrl: found.avatarUrl,
      bio: found.bio,
      phone: found.phone,
      estateName: found.estateName,
    };
  }

  @ApiOperation({
    summary: "Get another user's public profile (e.g. a chat peer)",
  })
  @ApiParam({ name: 'id', description: 'Target user id' })
  @ApiEnvelopeResponse({ description: 'Public profile fetched successfully' })
  @ApiCommonErrorResponses()
  @Get(':id')
  getPublicProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findPublicProfile(id);
  }

  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiEnvelopeResponse({ description: 'Profile updated successfully' })
  @ApiCommonErrorResponses()
  @Patch('me')
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @ApiOperation({
    summary: 'Permanently delete current user account and all associated data',
  })
  @ApiEnvelopeResponse({ description: 'Account deleted successfully' })
  @ApiCommonErrorResponses()
  @HttpCode(200)
  @Delete('me')
  deleteAccount(@CurrentUser() user: JwtPayload) {
    return this.usersService.deleteAccount(user.sub);
  }

  @ApiOperation({ summary: 'Change current user password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiEnvelopeResponse({ description: 'Password changed successfully' })
  @ApiCommonErrorResponses()
  @Patch('me/password')
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      user.sub,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
