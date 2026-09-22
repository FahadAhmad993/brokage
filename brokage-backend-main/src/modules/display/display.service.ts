import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';

import { DisplayPostEntity } from './entities/display-post.entity';
import { DisplayProfileEntity } from './entities/display-profile.entity';
import { CreateDisplayPostDto } from './dto/create-display-post.dto';
import { UpdateDisplayPostDto } from './dto/update-display-post.dto';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class DisplayService {
  constructor(
    @InjectRepository(DisplayPostEntity)
    private readonly postRepository: Repository<DisplayPostEntity>,
    @InjectRepository(DisplayProfileEntity)
    private readonly profileRepository: Repository<DisplayProfileEntity>,
    private readonly settingsService: SettingsService,
  ) {}

  // ---- Pricing / config ---------------------------------------------------

  private async computePrice(durationHours: number): Promise<number> {
    const settings = await this.settingsService.getSettings();
    const price = durationHours * Number(settings.displayPricePerHourPkr);
    return Math.round(price * 100) / 100;
  }

  async quotePrice(durationHours: number) {
    return { durationHours, price: await this.computePrice(durationHours) };
  }

  /** Live pricing + image bounds the mobile app needs to build the "Add Post" form. */
  async getPostConfig() {
    return this.settingsService.getPublicDisplayConfig();
  }

  // ---- Cover photo (top of "My Display") -----------------------------------

  async getProfile(userId: string) {
    const row = await this.profileRepository.findOne({ where: { userId } });
    return { userId, coverImageUrl: row?.coverImageUrl ?? null };
  }

  async setCover(userId: string, coverImageUrl: string | null) {
    let row = await this.profileRepository.findOne({ where: { userId } });
    if (!row) {
      row = this.profileRepository.create({ userId });
    }
    row.coverImageUrl = coverImageUrl;
    await this.profileRepository.save(row);
    return { userId, coverImageUrl: row.coverImageUrl };
  }

  // ---- Posts: create / edit / delete / sold --------------------------------

  async create(userId: string, dto: CreateDisplayPostDto) {
    const config = await this.settingsService.getPublicDisplayConfig();
    if (dto.images.length < config.minImages) {
      throw new BadRequestException(
        `Please add at least ${config.minImages} photo${config.minImages === 1 ? '' : 's'}.`,
      );
    }
    if (dto.images.length > config.maxImages) {
      throw new BadRequestException(
        `You can add at most ${config.maxImages} photos.`,
      );
    }

    const post = this.postRepository.create({
      userId,
      images: dto.images,
      marlaSize: dto.marlaSize,
      city: dto.city?.trim() || null,
      area: dto.area?.trim() || null,
      description: dto.description?.trim() || null,
      extraFields: sanitizeExtraFields(dto.extraFields),
      durationHours: dto.durationHours,
      price: await this.computePrice(dto.durationHours),
      status: 'pending',
      verifiedAt: null,
      expiresAt: null,
      soldAt: null,
      rejectionReason: null,
    });
    return this.postRepository.save(post);
  }

  async update(userId: string, id: string, dto: UpdateDisplayPostDto) {
    const post = await this.getOwned(userId, id);
    if (dto.images !== undefined) {
      const config = await this.settingsService.getPublicDisplayConfig();
      if (
        dto.images.length < config.minImages ||
        dto.images.length > config.maxImages
      ) {
        throw new BadRequestException(
          `Please add between ${config.minImages} and ${config.maxImages} photos.`,
        );
      }
      post.images = dto.images;
    }
    if (dto.marlaSize !== undefined) post.marlaSize = dto.marlaSize;
    if (dto.city !== undefined) post.city = dto.city?.trim() || null;
    if (dto.area !== undefined) post.area = dto.area?.trim() || null;
    if (dto.description !== undefined)
      post.description = dto.description?.trim() || null;
    if (dto.extraFields !== undefined)
      post.extraFields = sanitizeExtraFields(dto.extraFields);
    await this.postRepository.save(post);
    return this.toPublicDto(post, Date.now());
  }

  async remove(userId: string, id: string) {
    await this.getOwned(userId, id);
    await this.postRepository.delete({ id });
    return { success: true };
  }

  /** Owner taps "Sold" — post keeps showing (with a SOLD badge) until its paid timer runs out. */
  async markSold(userId: string, id: string) {
    const post = await this.getOwned(userId, id);
    post.status = 'sold';
    post.soldAt = new Date();
    await this.postRepository.save(post);
    return this.toPublicDto(post, Date.now());
  }

  private async getOwned(
    userId: string,
    id: string,
  ): Promise<DisplayPostEntity> {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.userId !== userId) {
      throw new ForbiddenException('This is not your post');
    }
    return post;
  }

  // ---- Reading ------------------------------------------------------------

  /** Flip any post whose paid timer has run out from active/sold to expired. */
  private async expireDuePosts() {
    await this.postRepository.update(
      { status: 'active', expiresAt: LessThan(new Date()) },
      { status: 'expired' },
    );
    // A sold post keeps its SOLD badge only until the same timer — after
    // that it quietly expires too, same as an unsold one would.
    await this.postRepository.update(
      { status: 'sold', expiresAt: LessThan(new Date()) },
      { status: 'expired' },
    );
  }

  /** Owner's own Display — every post regardless of status, so they can manage pending/rejected/sold ones too. */
  async findMine(userId: string) {
    await this.expireDuePosts();
    const posts = await this.postRepository.find({
      where: { userId },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
    const now = Date.now();
    return posts.map((post) => this.toPublicDto(post, now));
  }

  /** Someone else's Display — only what's actually live (active or recently sold), never pending/rejected/expired. */
  async findForUser(userId: string) {
    await this.expireDuePosts();
    const posts = await this.postRepository.find({
      where: [
        { userId, status: 'active' },
        { userId, status: 'sold' },
      ],
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
      throw new NotFoundException('Post not found');
    }
    return this.toPublicDto(post, Date.now());
  }

  /**
   * Community search → broker cards. Finds live Display posts matching a
   * free-text query against size ("5 marla") and description, then
   * collapses them to one card per broker (their best-matching post's
   * photo + a short detail line) — the grid the spec describes, not a
   * raw list of posts.
   */
  async searchBrokers(query: string) {
    await this.expireDuePosts();
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const marlaMatch = trimmed.match(/(\d+(\.\d+)?)/);
    const marlaValue = marlaMatch ? Number(marlaMatch[1]) : null;

    const qb = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .where('post.status IN (:...statuses)', { statuses: ['active', 'sold'] })
      .orderBy('post.createdAt', 'DESC');

    if (marlaValue !== null) {
      // Exact `=` on a numeric(10,2) column is usually fine, but a small
      // tolerance range sidesteps any float/parameter-type edge case
      // entirely (e.g. "5" parsed as a JS integer vs. a 5.00 numeric
      // column) — belt-and-braces so a search never silently misses an
      // exact-looking match.
      qb.andWhere('post."marlaSize" BETWEEN :marlaMin AND :marlaMax', {
        marlaMin: marlaValue - 0.01,
        marlaMax: marlaValue + 0.01,
      });
    } else {
      qb.andWhere('post.description ILIKE :q', { q: `%${trimmed}%` });
    }

    const posts = await qb.getMany();

    // One card per broker — first (most recent) matching post represents them.
    const byUser = new Map<string, DisplayPostEntity>();
    for (const post of posts) {
      if (!byUser.has(post.userId)) {
        byUser.set(post.userId, post);
      }
    }

    const userIds = Array.from(byUser.keys());
    const profiles =
      userIds.length > 0
        ? await this.profileRepository.findBy({ userId: In(userIds) })
        : [];
    const coverByUserId = new Map(
      profiles.map((p) => [p.userId, p.coverImageUrl]),
    );

    return Array.from(byUser.values()).map((post) => ({
      userId: post.userId,
      displayName: post.user?.displayName ?? 'User',
      avatarUrl: post.user?.avatarUrl ?? null,
      coverImageUrl: coverByUserId.get(post.userId) ?? null,
      estateName: post.user?.estateName ?? null,
      matchingPost: this.toPublicDto(post, Date.now()),
      totalMatches: posts.filter((p) => p.userId === post.userId).length,
    }));
  }

  // ---- Admin ----------------------------------------------------------------

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

  async verify(id: string) {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.status !== 'pending') {
      throw new ForbiddenException('Only pending posts can be verified');
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

  async reject(id: string, reason?: string) {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    post.status = 'rejected';
    post.rejectionReason = reason?.trim() || null;
    await this.postRepository.save(post);
    return { success: true, id: post.id, status: post.status };
  }

  async adminRemove(id: string) {
    const result = await this.postRepository.delete({ id });
    if (!result.affected) {
      throw new NotFoundException('Post not found');
    }
    return { success: true };
  }

  // ---- Shared shaping ---------------------------------------------------

  private toPublicDto(post: DisplayPostEntity, now: number) {
    const expiresAt = post.expiresAt ? new Date(post.expiresAt) : null;
    const remainingSeconds = expiresAt
      ? Math.max(0, Math.floor((expiresAt.getTime() - now) / 1000))
      : null;

    return {
      id: post.id,
      userId: post.userId,
      images: post.images,
      marlaSize: Number(post.marlaSize),
      city: post.city,
      area: post.area,
      description: post.description,
      extraFields: post.extraFields ?? {},
      durationHours: post.durationHours,
      price: Number(post.price),
      status: post.status,
      expiresAt: post.expiresAt,
      remainingSeconds,
      soldAt: post.soldAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,

      authorName: post.user?.displayName ?? 'User',
      authorAvatarUrl: post.user?.avatarUrl ?? null,
      // Populated from the same phone number the broker set on their
      // regular profile (Profile → Edit Profile) — there's no separate
      // "Display phone number"; whatever they've saved there is what the
      // Call button dials. `null` when they haven't set one at all, so
      // the app can show "No phone number" instead of dialing nothing.
      authorPhone: post.user?.phone ?? null,
    };
  }
}

/** Drop empty/blank answers and cap length defensively — same treatment as CommunityPostsService. */
function sanitizeExtraFields(
  raw: Record<string, string> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) {
    return out;
  }
  for (const [key, value] of Object.entries(raw)) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (trimmed) {
      out[key.slice(0, 64)] = trimmed.slice(0, 200);
    }
  }
  return out;
}
