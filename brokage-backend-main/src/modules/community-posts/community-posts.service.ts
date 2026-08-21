import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { CommunityPostEntity } from './entities/community-post.entity';
import { CreateCommunityPostDto } from './dto/create-community-post.dto';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class CommunityPostsService {
  constructor(
    @InjectRepository(CommunityPostEntity)
    private readonly postRepository: Repository<CommunityPostEntity>,
    private readonly settingsService: SettingsService,
  ) {}

  /** PKR for a given duration, at the admin's current per-hour rate. */
  private async computePrice(durationHours: number): Promise<number> {
    const settings = await this.settingsService.getSettings();
    const price = durationHours * Number(settings.pricePerHourPkr);
    // Round to the nearest paisa-free rupee so prices stay clean in the UI.
    return Math.round(price * 100) / 100;
  }

  /** Quote the price for a given duration without creating anything — used by the "select duration" step in the app before posting. */
  async quotePrice(durationHours: number) {
    return { durationHours, price: await this.computePrice(durationHours) };
  }

  /** Live pricing + image limits + admin-added custom fields — the mobile
   *  app fetches this to build the post form and its price preview. */
  async getPostConfig() {
    return this.settingsService.getPublicPostConfig();
  }

  async create(userId: string, dto: CreateCommunityPostDto) {
    const settings = await this.settingsService.getSettings();

    // Image count: the DTO only sanity-checks 1–20; the real bound is
    // whatever the admin has configured right now.
    if (dto.images.length < settings.minImages) {
      throw new BadRequestException(
        `Please add at least ${settings.minImages} photo${settings.minImages === 1 ? '' : 's'}.`,
      );
    }
    if (dto.images.length > settings.maxImages) {
      throw new BadRequestException(
        `You can add at most ${settings.maxImages} photos.`,
      );
    }

    const city = dto.city?.trim() ?? '';
    const area = dto.area?.trim() ?? '';
    if (settings.cityRequired && !city) {
      throw new BadRequestException('City is required.');
    }
    if (settings.areaRequired && !area) {
      throw new BadRequestException('Area is required.');
    }

    // Custom fields: keep only known keys (drop anything stale from an
    // older form), and require the ones the admin has marked required.
    const knownKeys = new Set(settings.customFields.map((f) => f.key));
    const extraFields: Record<string, string> = {};
    for (const field of settings.customFields) {
      const raw = dto.extraFields?.[field.key];
      const value = typeof raw === 'string' ? raw.trim() : '';
      if (field.required && !value) {
        throw new BadRequestException(`"${field.label}" is required.`);
      }
      if (value) {
        extraFields[field.key] = value.slice(0, 500);
      }
    }
    // Anything the client sent that isn't a known field is silently dropped
    // (knownKeys computed above only for documentation/clarity — the loop
    // above already only ever reads known keys).
    void knownKeys;

    const post = this.postRepository.create({
      userId,
      title: dto.title.trim(),
      description: dto.description.trim(),
      city,
      area,
      images: dto.images,
      durationHours: dto.durationHours,
      price: await this.computePrice(dto.durationHours),
      status: 'pending',
      verifiedAt: null,
      expiresAt: null,
      rejectionReason: null,
      extraFields,
    });

    return this.postRepository.save(post);
  }

  /** Flip any ad whose timer has run out from 'active' to 'expired'. Cheap, index-backed; called lazily before every public read and by the background sweeper. */
  private async expireDuePosts() {
    await this.postRepository.update(
      { status: 'active', expiresAt: LessThan(new Date()) },
      { status: 'expired' },
    );
  }

  /** Public feed: only ads an admin has verified and whose timer hasn't run out. */
  async findAll() {
    await this.expireDuePosts();

    const posts = await this.postRepository.find({
      where: { status: 'active' },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });

    const now = Date.now();
    return posts.map((post) => this.toPublicDto(post, now));
  }

  async findOne(id: string) {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!post) {
      throw new NotFoundException('Ad not found');
    }
    return this.toPublicDto(post, Date.now());
  }

  private toPublicDto(post: CommunityPostEntity, now: number) {
    const expiresAt = post.expiresAt ? new Date(post.expiresAt) : null;
    const remainingSeconds = expiresAt
      ? Math.max(0, Math.floor((expiresAt.getTime() - now) / 1000))
      : null;

    return {
      id: post.id,
      userId: post.userId,
      title: post.title,
      description: post.description,
      city: post.city,
      area: post.area,
      images: post.images,
      durationHours: post.durationHours,
      price: Number(post.price),
      status: post.status,
      expiresAt: post.expiresAt,
      remainingSeconds,
      extraFields: post.extraFields ?? {},
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,

      authorName: post.user?.displayName ?? 'User',
      authorAvatarUrl: post.user?.avatarUrl ?? null,
    };
  }

  // ---- Owner: my own ads (any status), for the "My Ads" screen ----------

  async findMine(userId: string) {
    await this.expireDuePosts();
    const posts = await this.postRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const now = Date.now();
    return posts.map((post) => this.toPublicDto(post, now));
  }

  // ---- Admin panel --------------------------------------------------------

  /** Every submitted ad, any status — newest first — backs the admin review queue. */
  async findAllForAdmin() {
    await this.expireDuePosts();
    const posts = await this.postRepository.find({
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
    const now = Date.now();
    return posts.map((post) => ({
      ...this.toPublicDto(post, now),
      authorEmail: post.user?.email ?? null,
      rejectionReason: post.rejectionReason,
    }));
  }

  /** Every ad a specific user has posted, any status — backs the admin's
   *  "user profile" view. */
  async findAllForUser(userId: string) {
    await this.expireDuePosts();
    const posts = await this.postRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const now = Date.now();
    return posts.map((post) => this.toPublicDto(post, now));
  }

  /** Admin approves a pending ad: goes live now, timer starts from this moment. */
  async verify(id: string) {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('Ad not found');
    }
    if (post.status !== 'pending') {
      throw new ForbiddenException('Only pending ads can be verified');
    }
    const verifiedAt = new Date();
    const expiresAt = new Date(
      verifiedAt.getTime() + post.durationHours * 60 * 60 * 1000,
    );
    post.status = 'active';
    post.verifiedAt = verifiedAt;
    post.expiresAt = expiresAt;
    post.rejectionReason = null;
    await this.postRepository.save(post);
    return { success: true, id: post.id, status: post.status, expiresAt };
  }

  /** Admin declines a pending ad, optionally with a reason shown to the user. */
  async reject(id: string, reason?: string) {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('Ad not found');
    }
    post.status = 'rejected';
    post.rejectionReason = reason?.trim() || null;
    await this.postRepository.save(post);
    return { success: true, id: post.id, status: post.status };
  }

  /** Admin can pull any ad down immediately (abuse, mistake, etc.). */
  async remove(id: string) {
    const result = await this.postRepository.delete({ id });
    if (!result.affected) {
      throw new NotFoundException('Ad not found');
    }
    return { success: true };
  }
}
