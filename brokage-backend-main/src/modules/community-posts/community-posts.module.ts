import {
  Module,
} from '@nestjs/common';

import {
  TypeOrmModule,
} from '@nestjs/typeorm';

import {
  CommunityPostEntity,
} from './entities/community-post.entity';

import {
  CommunityPostsService,
} from './community-posts.service';

import {
  CommunityPostsController,
} from './community-posts.controller';

import {
   UserEntity,
  } from '../users/entities/user.entity';

import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommunityPostEntity,
          UserEntity,
    ]),
    SettingsModule,
  ],

  controllers: [
    CommunityPostsController,
  ],

  providers: [
    CommunityPostsService,
  ],

  exports: [
    CommunityPostsService,
  ],
})
export class CommunityPostsModule {}