import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { OtpService } from './otp.service';
import { EmailService } from './email.service';
import { OtpCodeEntity } from './entities/otp-code.entity';
import { UsersModule } from '../users/users.module';
import { ChatsModule } from '../chats/chats.module';

@Module({
  imports: [
    UsersModule,
    ChatsModule,
    PassportModule,
    ConfigModule,
    TypeOrmModule.forFeature([OtpCodeEntity]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d') as never,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, OtpService, EmailService],
  exports: [JwtModule],
})
export class AuthModule {}
