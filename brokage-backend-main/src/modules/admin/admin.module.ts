import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ChatsModule } from '../chats/chats.module';
import { CommunityPostsModule } from '../community-posts/community-posts.module';
import { ModerationModule } from '../moderation/moderation.module';
import { SettingsModule } from '../settings/settings.module';
import { DisplayModule } from '../display/display.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminCommunitiesController } from './admin-communities.controller';
import { AdminCommunityPostsController } from './admin-community-posts.controller';
import { AdminDisplayPostsController } from './admin-display-posts.controller';
import { AdminReportsController } from './admin-reports.controller';
import { AdminChatsController } from './admin-chats.controller';

/**
 * Thin by design: every admin controller delegates straight to the same
 * services the regular app uses (`UsersService`, `ChatsService`,
 * `CommunityPostsService`) so there's exactly one place each piece of
 * business logic lives. `AdminGuard` (layered on `JwtAuthGuard`) is the
 * only admin-specific piece — see `common/guards/admin.guard.ts`.
 *
 * `AdminSettingsController` lives inside `SettingsModule` itself (not
 * re-declared here) since `SettingsModule` is also imported directly by
 * `CommunityPostsModule` — Nest only needs the module imported once for
 * its controllers to be picked up.
 */
@Module({
  imports: [
    UsersModule,
    ChatsModule,
    CommunityPostsModule,
    DisplayModule,
    ModerationModule,
    SettingsModule,
  ],
  controllers: [
    AdminUsersController,
    AdminCommunitiesController,
    AdminCommunityPostsController,
    AdminDisplayPostsController,
    AdminReportsController,
    AdminChatsController,
  ],
})
export class AdminModule {}
