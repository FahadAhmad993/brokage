import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisplayPostEntity } from './entities/display-post.entity';
import { DisplayPostViewEntity } from './entities/display-post-view.entity';
import { DisplayProfileEntity } from './entities/display-profile.entity';
import { DisplayService } from './display.service';
import { DisplayController } from './display.controller';
import { SettingsModule } from '../settings/settings.module';
import { ChatsModule } from '../chats/chats.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DisplayPostEntity, DisplayProfileEntity, DisplayPostViewEntity]),
    SettingsModule,
    ChatsModule,
  ],
  controllers: [DisplayController],
  providers: [DisplayService],
  exports: [DisplayService],
})
export class DisplayModule {}
