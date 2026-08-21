import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
import { UserBlockEntity } from './entities/user-block.entity';
import { ContentReportEntity } from './entities/content-report.entity';
import { UserEntity } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserBlockEntity,
      ContentReportEntity,
      UserEntity,
    ]),
  ],
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
