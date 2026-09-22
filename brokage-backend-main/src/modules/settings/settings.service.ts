import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSettingEntity } from './entities/app-setting.entity';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';

const SETTINGS_KEY = 'default';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AppSettingEntity)
    private readonly settingsRepository: Repository<AppSettingEntity>,
  ) {}

  /** Get the single settings row, creating it with defaults if it's ever missing. */
  async getSettings(): Promise<AppSettingEntity> {
    let row = await this.settingsRepository.findOne({
      where: { key: SETTINGS_KEY },
    });
    if (!row) {
      row = await this.settingsRepository.save(
        this.settingsRepository.create({ key: SETTINGS_KEY }),
      );
    }
    return row;
  }

  async updateSettings(dto: UpdateAppSettingsDto): Promise<AppSettingEntity> {
    const row = await this.getSettings();

    if (dto.pricePerHourPkr !== undefined)
      row.pricePerHourPkr = dto.pricePerHourPkr;
    if (dto.displayPricePerHourPkr !== undefined) {
      row.displayPricePerHourPkr = dto.displayPricePerHourPkr;
    }
    if (dto.minImages !== undefined) row.minImages = dto.minImages;
    if (dto.maxImages !== undefined) row.maxImages = dto.maxImages;
    if (dto.cityRequired !== undefined) row.cityRequired = dto.cityRequired;
    if (dto.areaRequired !== undefined) row.areaRequired = dto.areaRequired;
    if (dto.customFields !== undefined) {
      // De-dupe by key defensively — two custom fields sharing a key would
      // silently clobber each other's answers in `extraFields`.
      const seen = new Set<string>();
      row.customFields = dto.customFields.filter((f) => {
        const key = f.key.trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    if (dto.chatRetentionDays !== undefined) {
      row.chatRetentionDays = dto.chatRetentionDays;
    }

    if (row.minImages > row.maxImages) {
      // Keep the pair sane rather than rejecting the whole request — the
      // admin panel already prevents this in the UI, this is just a guard.
      row.maxImages = row.minImages;
    }

    return this.settingsRepository.save(row);
  }

  /** Current retention window in days, used by `ChatRetentionService`'s sweep. */
  async getChatRetentionDays(): Promise<number> {
    const s = await this.getSettings();
    const days = Number(s.chatRetentionDays);
    return Number.isFinite(days) && days > 0 ? days : 20;
  }

  /** Public shape the mobile app needs to build its post form / price preview. */
  async getPublicPostConfig() {
    const s = await this.getSettings();
    return {
      pricePerHourPkr: Number(s.pricePerHourPkr),
      minImages: s.minImages,
      maxImages: s.maxImages,
      cityRequired: s.cityRequired,
      areaRequired: s.areaRequired,
      customFields: s.customFields,
    };
  }

  /** Public shape the mobile app needs to build the Display "Add Post" form / price preview. */
  async getPublicDisplayConfig() {
    const s = await this.getSettings();
    return {
      pricePerHourPkr: Number(s.displayPricePerHourPkr),
      // Fixed at the product spec (6–7 photos per Display post) rather
      // than admin-configurable like the Community feed's image bounds.
      minImages: 1,
      maxImages: 7,
    };
  }
}
