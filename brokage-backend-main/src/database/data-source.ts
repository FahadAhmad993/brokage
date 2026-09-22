import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { UserEntity } from '../modules/users/entities/user.entity';
import { PropertyEntity } from '../modules/properties/entities/property.entity';
import { PropertyImageEntity } from '../modules/properties/entities/property-image.entity';
import { ChatThreadEntity } from '../modules/chats/entities/chat-thread.entity';
import { ChatParticipantEntity } from '../modules/chats/entities/chat-participant.entity';
import { ChatMessageEntity } from '../modules/chats/entities/chat-message.entity';
import { UserBlockEntity } from '../modules/moderation/entities/user-block.entity';
import { ContentReportEntity } from '../modules/moderation/entities/content-report.entity';
import { CommunityPostEntity } from '../modules/community-posts/entities/community-post.entity';
import { AppSettingEntity } from '../modules/settings/entities/app-setting.entity';
import { DisplayPostEntity } from '../modules/display/entities/display-post.entity';
import { DisplayProfileEntity } from '../modules/display/entities/display-profile.entity';
import { OtpCodeEntity } from '../modules/auth/entities/otp-code.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? '5432'),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'sanctuary',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [
    UserEntity,
    PropertyEntity,
    PropertyImageEntity,
    ChatThreadEntity,
    ChatParticipantEntity,
    ChatMessageEntity,
    UserBlockEntity,
    ContentReportEntity,
    CommunityPostEntity,
    AppSettingEntity,
    DisplayPostEntity,
    DisplayProfileEntity,
    OtpCodeEntity,
  ],
  migrations: ['src/database/migrations/*{.ts,.js}'],
});
