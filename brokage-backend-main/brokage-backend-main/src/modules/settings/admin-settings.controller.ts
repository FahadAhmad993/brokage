import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { SettingsService } from './settings.service';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@ApiTags('Admin / Settings')
@ApiBearerAuth('bearer')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @ApiOperation({
    summary:
      'Platform settings: PKR/hour ad pricing, min/max ad photos, and any custom ad-form fields.',
  })
  @Get()
  get() {
    return this.settingsService.getSettings();
  }

  @ApiOperation({ summary: 'Update platform settings (partial patch).' })
  @Patch()
  update(@Body() dto: UpdateAppSettingsDto) {
    return this.settingsService.updateSettings(dto);
  }
}
