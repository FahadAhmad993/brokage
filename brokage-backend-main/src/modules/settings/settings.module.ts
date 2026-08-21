import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSettingEntity } from './entities/app-setting.entity';
import { SettingsService } from './settings.service';
import { AdminSettingsController } from './admin-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AppSettingEntity])],
  controllers: [AdminSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
