import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { ChatsModule } from './modules/chats/chats.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { UserContactEntity } from './modules/contacts/entities/user-contact.entity';
import { AppController } from './app.controller';
import { UserEntity } from './modules/users/entities/user.entity';
import { PropertyEntity } from './modules/properties/entities/property.entity';
import { PropertyImageEntity } from './modules/properties/entities/property-image.entity';
import { ChatThreadEntity } from './modules/chats/entities/chat-thread.entity';
import { ChatParticipantEntity } from './modules/chats/entities/chat-participant.entity';
import { ChatMessageEntity } from './modules/chats/entities/chat-message.entity';
import { UserBlockEntity } from './modules/moderation/entities/user-block.entity';
import { ContentReportEntity } from './modules/moderation/entities/content-report.entity';
import { JwtAuthMiddleware } from './common/middleware/jwt-auth.middleware';
import { CommunityPostsModule } from './modules/community-posts/community-posts.module';
import { CommunityPostEntity } from './modules/community-posts/entities/community-post.entity';
import { AppSettingEntity } from './modules/settings/entities/app-setting.entity';
import { AdminModule } from './modules/admin/admin.module';
import { DisplayModule } from './modules/display/display.module';
import { DisplayPostEntity } from './modules/display/entities/display-post.entity';
import { DisplayPostViewEntity } from './modules/display/entities/display-post-view.entity';
import { DisplayProfileEntity } from './modules/display/entities/display-profile.entity';
import { OtpCodeEntity } from './modules/auth/entities/otp-code.entity';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        DB_HOST: Joi.string().default('localhost'),
        DB_PORT: Joi.number().default(5432),
        DB_USER: Joi.string().default('postgres'),
        DB_PASSWORD: Joi.string().default('postgres'),
        DB_NAME: Joi.string().default('sanctuary'),
        DB_SYNC: Joi.boolean().default(false),
        DB_SSL: Joi.boolean().default(false),
        DB_LOGGING: Joi.boolean().default(false),
        DB_POOL_MAX: Joi.number().integer().min(1).max(200).default(20),
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_EXPIRES_IN: Joi.string().default('7d'),
        CORS_ORIGIN: Joi.string().default('*'),
        THROTTLE_TTL_MS: Joi.number().default(60_000),
        THROTTLE_LIMIT: Joi.number().default(120),
        // Optional at boot (so the app still starts without it) but
        // required in practice the moment anyone tries to register/log
        // in — EmailService throws a clear error at send-time if it's
        // missing rather than here, since some deployments (CI, one-off
        // scripts) never need to send an email at all.
        BREVO_API_KEY: Joi.string().allow('').default(''),
        BREVO_SENDER_EMAIL: Joi.string().default('no-reply@brokage.app'),
        BREVO_SENDER_NAME: Joi.string().default('Brokage'),
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          // Joi coerces these to numbers up-front, so we can request them
          // typed directly instead of `Number(get<string>())` round-trips.
          ttl: configService.get<number>('THROTTLE_TTL_MS', 60_000),
          limit: configService.get<number>('THROTTLE_LIMIT', 120),
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USER', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_NAME', 'sanctuary'),

        synchronize: configService.get<boolean>('DB_SYNC', false),
        logging: configService.get<boolean>('DB_LOGGING', false),
        // Supabase (and most managed Postgres hosts) require SSL and use a
        // certificate that isn't in Node's default CA bundle — without this,
        // connecting fails with "self signed certificate in certificate
        // chain". `rejectUnauthorized: false` trusts the connection without
        // verifying the cert chain, which is the standard approach for
        // managed Postgres providers (the connection itself is still
        // encrypted, this only skips CA verification). Off by default so
        // local Postgres (no SSL) is unaffected; set DB_SSL=true in
        // production's .env.
        ssl: configService.get<boolean>('DB_SSL', false)
          ? { rejectUnauthorized: false }
          : false,
        // Pool size matters for scaling concurrent socket fan-outs. Defaults
        // are intentionally conservative; tune via env once load-tested.
        extra: {
          max: configService.get<number>('DB_POOL_MAX', 20),
          // Drop idle connections so a sustained idle period doesn't keep
          // exhausting PG's max_connections on shared infrastructure.
          idleTimeoutMillis: 30_000,
        },
        entities: [
          UserEntity,
          PropertyEntity,
          PropertyImageEntity,
          ChatThreadEntity,
          ChatParticipantEntity,
          ChatMessageEntity,
          UserBlockEntity,
          UserContactEntity,
          ContentReportEntity,
          CommunityPostEntity,
          AppSettingEntity,
          DisplayPostEntity,
          DisplayPostViewEntity,
          DisplayProfileEntity,
          OtpCodeEntity,
        ],
      }),
    }),
    AuthModule,
    UsersModule,
    PropertiesModule,
    ChatsModule,
    ModerationModule,
    ContactsModule,
    CommunityPostsModule,
    DisplayModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    JwtAuthMiddleware,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtAuthMiddleware)
      .forRoutes(
        { path: 'chats', method: RequestMethod.ALL },
        { path: 'chats/(.*)', method: RequestMethod.ALL },
        { path: 'properties', method: RequestMethod.POST },
        { path: 'community/posts', method: RequestMethod.ALL },
        { path: 'community/posts/(.*)', method: RequestMethod.ALL },
        { path: 'display', method: RequestMethod.ALL },
        { path: 'display/(.*)', method: RequestMethod.ALL },
        { path: 'admin/(.*)', method: RequestMethod.ALL },
      );
  }
}
