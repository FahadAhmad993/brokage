import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisplayPostEntity } from './entities/display-post.entity';
import { DisplayProfileEntity } from './entities/display-profile.entity';
import { DisplayService } from './display.service';
import { DisplayController } from './display.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DisplayPostEntity, DisplayProfileEntity]),
    SettingsModule,
  ],
  controllers: [DisplayController],
  providers: [DisplayService],
  exports: [DisplayService],
})
export class DisplayModule {}
