import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { ChatsGateway } from './chats.gateway';
import { ChatRetentionService } from './chat-retention.service';
import { ChatThreadEntity } from './entities/chat-thread.entity';
import { ChatParticipantEntity } from './entities/chat-participant.entity';
import { ChatMessageEntity } from './entities/chat-message.entity';
import { ModerationModule } from '../moderation/moderation.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatThreadEntity,
      ChatParticipantEntity,
      ChatMessageEntity,
    ]),
    ModerationModule,
    SettingsModule,
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [ChatsController],
  providers: [ChatsService, ChatsGateway, ChatRetentionService],
  exports: [ChatsService, ChatsGateway],
})
export class ChatsModule {}
