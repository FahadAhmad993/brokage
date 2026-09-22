import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  IsNull,
  LessThan,
  MoreThan,
  Not,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { ChatThreadEntity } from './entities/chat-thread.entity';
import { ChatParticipantEntity } from './entities/chat-participant.entity';
import { ChatMessageEntity } from './entities/chat-message.entity';
import { ListMessageQueryDto } from './dto/list-message-query.dto';
import { ListThreadQueryDto } from './dto/list-thread-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateThreadDto } from './dto/create-thread.dto';
import { PropertyEntity } from '../properties/entities/property.entity';
import { UserEntity } from '../users/entities/user.entity';
import { ModerationService } from '../moderation/moderation.service';

const COMMON_THREAD_TITLE = 'Real Estate community';

/**
 * Defensive normalizer so a bad payload that slipped past validation (or a
 * non-controller caller) can't write garbage into JSONB. Drops the attachment
 * entirely when latitude/longitude aren't finite numbers in range.
 */
function sanitizeLocationContext(
  raw: ChatLocationRefDto | undefined,
): ChatLocationRefDto | null {
  if (!raw) {
    return null;
  }
  const { latitude, longitude, label } = raw;
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return {
    latitude,
    longitude,
    label: typeof label === 'string' ? label.slice(0, 255) : null,
  };
}

/**
 * Defensive normalizer for the "Reply Privately" quote snapshot — mirrors
 * `sanitizeLocationContext`. Drops the attachment entirely rather than
 * writing a half-valid quote into JSONB.
 */
function sanitizeReplyToCommunityMessage(
  raw: ReplyToCommunityMessageDto | undefined,
): ReplyToCommunityMessageDto | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const { messageId, threadId, threadTitle, body, authorId } = raw;
  if (
    typeof messageId !== 'string' ||
    !messageId.trim() ||
    typeof threadId !== 'string' ||
    !threadId.trim() ||
    typeof authorId !== 'string' ||
    !authorId.trim()
  ) {
    return null;
  }
  return {
    messageId: messageId.trim(),
    threadId: threadId.trim(),
    threadTitle:
      typeof threadTitle === 'string' ? threadTitle.slice(0, 200) : '',
    body: typeof body === 'string' ? body.slice(0, 500) : '',
    imageUrl:
      typeof raw.imageUrl === 'string' && raw.imageUrl.trim()
        ? raw.imageUrl.trim().slice(0, 2048)
        : null,
    authorId: authorId.trim(),
    authorName:
      typeof raw.authorName === 'string' ? raw.authorName.slice(0, 100) : null,
    authorAvatarUrl:
      typeof raw.authorAvatarUrl === 'string'
        ? raw.authorAvatarUrl.slice(0, 2048)
        : null,
  };
}

export type ChatListingRefDto = {
  id: string;
  title: string;
  imageUrl: string;
  location: string;
  priceMonthly: number;
};

export type ChatLocationRefDto = {
  latitude: number;
  longitude: number;
  label?: string | null;
};

export type ChatMessageDto = {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  /** URL of the author's avatar — needed by group chats to identify the
   *  sender visually. `null` when the user hasn't uploaded one. */
  authorAvatarUrl: string | null;
  body: string;
  createdAt: Date;
  clientId?: string | null;
  listingContext?: ChatListingRefDto;
  locationContext?: ChatLocationRefDto;
  imageUrl?: string | null;

  communityPostContext?: {
    id: string;
    title: string;
    description: string;
    city: string;
    images: string[];
    authorId: string;
    authorName?: string | null;
    authorAvatarUrl?: string | null;
    kind?: 'community' | 'display';
    marlaSize?: number;
  } | null;

  /** WhatsApp-style "Reply Privately" quote of the community message this
   *  private message is replying to. See `ChatMessageEntity.replyToCommunityMessage`. */
  replyToCommunityMessage?: {
    messageId: string;
    threadId: string;
    threadTitle: string;
    body: string;
    imageUrl?: string | null;
    authorId: string;
    authorName?: string | null;
    authorAvatarUrl?: string | null;
  } | null;

  isDeletedForEveryone?: boolean;
};

export type ReplyToCommunityMessageDto = {
  messageId: string;
  threadId: string;
  threadTitle: string;
  body: string;
  imageUrl?: string | null;
  authorId: string;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
};

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(ChatThreadEntity)
    private readonly threadRepository: Repository<ChatThreadEntity>,
    @InjectRepository(ChatParticipantEntity)
    private readonly participantRepository: Repository<ChatParticipantEntity>,
    @InjectRepository(ChatMessageEntity)
    private readonly messageRepository: Repository<ChatMessageEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly moderationService: ModerationService,
  ) {}

  /** Legacy title(s) this app has used for the default community — renamed
   *  in place instead of leaving a stale duplicate when `COMMON_THREAD_TITLE`
   *  changes. */
  private static readonly LEGACY_GLOBAL_THREAD_TITLES = ['Brokage Community'];

  /**
   * Called on every login/register. Ensures the default community exists
   * (self-healing a legacy title in place) and that this user is a member
   * of every community — the default plus any admin-created ones.
   */
  async ensureUserInGlobalThread(userId: string) {
    const defaultThread = await this.ensureDefaultCommunityExists();
    await this.ensureUserInAllCommunities(userId);
    return defaultThread;
  }

  private async ensureDefaultCommunityExists() {
    const existing = await this.threadRepository.findOne({
      where: { type: 'group', title: COMMON_THREAD_TITLE },
    });
    if (existing) {
      return existing;
    }
    // One-time migration path: rename a legacy-titled thread in place
    // instead of creating a duplicate default community.
    const legacy = await this.threadRepository.findOne({
      where: ChatsService.LEGACY_GLOBAL_THREAD_TITLES.map((title) => ({
        type: 'group' as const,
        title,
      })),
    });
    if (legacy) {
      legacy.title = COMMON_THREAD_TITLE;
      return this.threadRepository.save(legacy);
    }
    return this.threadRepository.save(
      this.threadRepository.create({
        type: 'group',
        title: COMMON_THREAD_TITLE,
      }),
    );
  }

  /** Joins `userId` to every community they aren't already a member of. */
  private async ensureUserInAllCommunities(userId: string) {
    const communities = await this.threadRepository.find({
      where: { type: 'group' },
      select: { id: true },
    });
    if (communities.length === 0) {
      return;
    }
    const existingMemberships = await this.participantRepository.find({
      where: { userId, threadId: In(communities.map((c) => c.id)) },
      select: { threadId: true },
    });
    const joinedIds = new Set(existingMemberships.map((p) => p.threadId));
    const toJoin = communities.filter((c) => !joinedIds.has(c.id));
    if (toJoin.length === 0) {
      return;
    }
    await this.participantRepository.save(
      toJoin.map((c) =>
        this.participantRepository.create({ threadId: c.id, userId }),
      ),
    );
  }

  // ---- Admin panel: communities ------------------------------------------

  /** All communities (group threads) with member counts — admin "Communities" list.
   *  Soft-deleted communities (still inside their 7-day restore window) are
   *  excluded — see `listDeletedCommunities` for those. */
  async listCommunities() {
    const threads = await this.threadRepository.find({
      where: { type: 'group', deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
    if (threads.length === 0) {
      return [];
    }
    const counts = await this.participantRepository
      .createQueryBuilder('p')
      .select('p."threadId"', 'threadId')
      .addSelect('COUNT(*)', 'count')
      .where('p."threadId" IN (:...ids)', { ids: threads.map((t) => t.id) })
      .groupBy('p."threadId"')
      .getRawMany<{ threadId: string; count: string }>();
    const countByThread = new Map(
      counts.map((c) => [c.threadId, Number(c.count)]),
    );
    return threads.map((t) => ({
      id: t.id,
      title: t.title,
      memberCount: countByThread.get(t.id) ?? 0,
      createdAt: t.createdAt,
    }));
  }

  /** Communities still inside their 7-day restore window — admin "Recently deleted" list. */
  async listDeletedCommunities() {
    const threads = await this.threadRepository.find({
      where: { type: 'group', deletedAt: Not(IsNull()) },
      order: { deletedAt: 'DESC' },
    });
    return threads.map((t) => ({
      id: t.id,
      title: t.title,
      deletedAt: t.deletedAt,
      restoreExpiresAt: t.restoreExpiresAt,
      deletedReason: t.deletedReason,
    }));
  }

  /** Admin deletes a community — soft-delete only, restorable for 7 days.
   *  Nothing is actually removed yet, so every message/member/ad reference
   *  comes back exactly as it was if restored in time. */
  async deleteCommunity(id: string, reason?: string) {
    const thread = await this.threadRepository.findOne({
      where: { id, type: 'group' },
    });
    if (!thread) {
      throw new NotFoundException('Community not found');
    }
    if (thread.title === COMMON_THREAD_TITLE) {
      throw new ForbiddenException('The default community cannot be deleted');
    }
    const now = new Date();
    thread.deletedAt = now;
    thread.restoreExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    thread.deletedReason = reason?.trim() || null;
    await this.threadRepository.save(thread);
    return {
      success: true,
      id: thread.id,
      restoreExpiresAt: thread.restoreExpiresAt,
    };
  }

  /** Admin restores a soft-deleted community while still inside its 7-day window. */
  async restoreCommunity(id: string) {
    const thread = await this.threadRepository.findOne({
      where: { id, type: 'group' },
    });
    if (!thread || !thread.deletedAt) {
      throw new NotFoundException('Deleted community not found');
    }
    if (
      thread.restoreExpiresAt &&
      thread.restoreExpiresAt.getTime() < Date.now()
    ) {
      throw new ForbiddenException(
        'This community is past its 7-day restore window',
      );
    }
    thread.deletedAt = null;
    thread.restoreExpiresAt = null;
    thread.deletedReason = null;
    await this.threadRepository.save(thread);
    return { success: true, id: thread.id };
  }

  /** Called by the background sweep: hard-deletes any community whose
   *  restore window has passed. DB-level `onDelete: CASCADE` on messages
   *  and participants takes care of the rest of the row cleanup. */
  async purgeExpiredDeletedCommunities() {
    const result = await this.threadRepository.delete({
      type: 'group',
      restoreExpiresAt: LessThan(new Date()),
    });
    return result.affected ?? 0;
  }

  /**
   * Admin-only: create a new community (a separate group thread — messages
   * sent there stay scoped to that thread, same as any other chat). Every
   * existing user is backfilled as a member immediately so it shows up in
   * their chat list without waiting for their next login; new users pick it
   * up automatically via `ensureUserInAllCommunities` at their next login.
   */
  async createCommunity(title: string) {
    const trimmed = title.trim();
    if (!trimmed) {
      throw new BadRequestException('Community title is required');
    }
    const thread = await this.threadRepository.save(
      this.threadRepository.create({ type: 'group', title: trimmed }),
    );
    const users = await this.dataSource
      .getRepository(UserEntity)
      .find({ select: { id: true } });
    if (users.length > 0) {
      await this.participantRepository.save(
        users.map((u) =>
          this.participantRepository.create({
            threadId: thread.id,
            userId: u.id,
          }),
        ),
      );
    }
    return {
      id: thread.id,
      title: thread.title,
      memberCount: users.length,
      createdAt: thread.createdAt,
    };
  }

  async listThreads(userId: string, query: ListThreadQueryDto) {
    // NOTE: this used to unconditionally call `ensureUserInGlobalThread()`
    // here on every single load of the chats list — 3-5 extra sequential DB
    // queries every time, even though it's a no-op 99.9% of the time. A
    // user is already joined to every community at registration
    // (AuthService.register) and to any new community at creation time
    // (createCommunity backfills every existing user), so this hot path
    // never actually needed to re-check it. This was the single biggest
    // contributor to "chat takes a while to load".

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.threadRepository
      .createQueryBuilder('thread')
      .innerJoin(
        'thread.participants',
        'participant',
        'participant.userId = :userId',
        {
          userId,
        },
      )
      // A soft-deleted community (still inside its 7-day restore window)
      // shouldn't appear in anyone's chat list — restoring it brings it
      // straight back with everything intact, but until then it's hidden.
      .andWhere('thread.deletedAt IS NULL')
      // "Delete chat" — this user removed the thread from their own inbox.
      // Reappears automatically once a new message arrives (see sendMessage).
      .andWhere('participant.hiddenAt IS NULL')
      .leftJoinAndSelect('thread.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'participantUser')
      .leftJoinAndSelect('thread.relatedProperty', 'relatedProperty')
      .leftJoinAndSelect('relatedProperty.images', 'relatedPropertyImages')
      .orderBy('thread.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [threads, total] = await qb.getManyAndCount();
    if (threads.length === 0) {
      return {
        items: [],
        pagination: { page, limit, total, hasNext: false },
      };
    }

    // Previously: per-thread `findOne` for last message + self-participant
    // → 2N queries per page. Now: two batched lookups regardless of page size.
    const threadIds = threads.map((thread) => thread.id);
    const [lastMessages, selfParticipants] = await Promise.all([
      this.findLastMessagesForThreads(threadIds),
      this.participantRepository.find({
        where: { threadId: In(threadIds), userId },
        select: { threadId: true, unreadCount: true },
      }),
    ]);
    const lastMessageByThreadId = new Map<string, ChatMessageEntity>(
      lastMessages.map((message) => [message.threadId, message]),
    );
    const unreadByThreadId = new Map<string, number>(
      selfParticipants.map((participant) => [
        participant.threadId,
        Math.max(0, participant.unreadCount ?? 0),
      ]),
    );

    return {
      items: threads.map((thread) =>
        this.buildThreadSummary(thread, userId, {
          lastMessage: lastMessageByThreadId.get(thread.id),
          unreadCount: unreadByThreadId.get(thread.id) ?? 0,
        }),
      ),
      pagination: { page, limit, total, hasNext: page * limit < total },
    };
  }

  /**
   * Fetch the most recent message for each thread in `threadIds` using a
   * `DISTINCT ON` window — one round-trip regardless of how many threads
   * are on the page. PG's planner uses `(threadId, createdAt DESC)` if
   * indexed; today this still works (it falls back to a sort) and is the
   * place to add a composite index when traffic justifies it.
   */
  private async findLastMessagesForThreads(
    threadIds: string[],
  ): Promise<ChatMessageEntity[]> {
    if (threadIds.length === 0) {
      return [];
    }
    return this.messageRepository
      .createQueryBuilder('message')
      .distinctOn(['message.threadId'])
      .where('message.threadId IN (:...threadIds)', { threadIds })
      .orderBy('message.threadId')
      .addOrderBy('message.createdAt', 'DESC')
      .getMany();
  }

  async listMessages(
    userId: string,
    threadId: string,
    query: ListMessageQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    // "Clear all messages" is per-user: anything created before the user's
    // own `clearedAt` cutoff is excluded from THEIR list only. This same
    // row also tells us whether the user is even a participant, so it
    // replaces the separate `assertMembership()` round trip that used to
    // run first — one query instead of two.
    //
    // IMPORTANT: fetch the full row here, not a partial `select`. This used
    // to be a `select: { clearedAt: true }` partial-select — harmless back
    // when a `null` result here only skipped the optional clear-chat
    // filter (a *separate*, always-correct `assertMembership()` call was
    // the real gate). Once this same result was reused *as* the gate, any
    // discrepancy between a partial-select `findOne` and a plain
    // exists/findOne check became a hard 403 for legitimate participants —
    // exactly the "you are not a participant" bug. Fetching the whole row
    // matches the exact query shape `assertMembership` used to run, so
    // there's no longer any behavioral difference to hide a bug in.
    const selfParticipant = await this.participantRepository.findOne({
      where: { threadId, userId },
    });
    if (!selfParticipant) {
      throw new ForbiddenException('You are not a participant in this thread');
    }

    const where: Record<string, unknown> = { threadId };
    if (selfParticipant.clearedAt) {
      where.createdAt = MoreThan(selfParticipant.clearedAt);
    }

    /**
     * Newest-first pages (chat UX): page 1 = latest `limit` messages.
     * TypeORM returns DESC rows; reverse so API items stay chronological
     * (oldest→newest) within each page for clients.
     *
     * The three calls below are all independent of each other (none reads
     * a value the others produce), so they run concurrently instead of one
     * after another — this alone cuts three sequential DB round trips down
     * to one, which was a big share of "opening a chat takes a while".
     */
    const [[messagesDesc, total], blockedIdsList] = await Promise.all([
      this.messageRepository.findAndCount({
        where,
        relations: { author: true },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.moderationService.getBlockedUserIds(userId),
      this.markThreadRead(userId, threadId),
    ]);
    const chronological = [...messagesDesc].reverse();

    // UGC safety: hide messages authored by users this user has blocked.
    const blockedIds = new Set(blockedIdsList);
    const visible = chronological.filter((message) => {
      if (blockedIds.has(message.authorId)) {
        return false;
      }
      // "Delete for me" hides the message entirely from that user only.
      if ((message.deletedForUserIds ?? []).includes(userId)) {
        return false;
      }
      return true;
    });

    return {
      items: visible.map((message) => this.toMessageDto(message)),
      pagination: { page, limit, total, hasNext: page * limit < total },
    };
  }

  async createThread(userId: string, dto: CreateThreadDto) {
    if (dto.type === 'direct' && !dto.peerUserId) {
      throw new NotFoundException('peerUserId is required for direct chats');
    }

    if (dto.type === 'direct' && dto.peerUserId) {
      // UGC safety: a blocked relationship (either direction) cannot open a DM.
      if (
        await this.moderationService.isBlockedEitherWay(userId, dto.peerUserId)
      ) {
        throw new ForbiddenException(
          'You cannot start a conversation with this user',
        );
      }
      const existing = await this.findDirectThreadBetweenUsers(
        userId,
        dto.peerUserId,
      );
      if (existing) {
        // Backfill: thread already existed (e.g. from a prior plain DM) but
        // didn't have a listing attached yet — attach the ad now so it
        // "copies along" into the conversation. Never overwrite an ad/
        // property that's already attached.
        // delete 1
        // if (
        //   dto.relatedListingSnapshot &&
        //   !existing.relatedPropertyId &&
        //   !existing.relatedListingSnapshot
        // ) {
        //   existing.relatedListingSnapshot = dto.relatedListingSnapshot;
        //   await this.threadRepository.save(existing);
        // }
        return this.toThreadSummary(existing, userId);
      }
    }

    const thread = await this.threadRepository.save(
      this.threadRepository.create({
        type: dto.type,
        title: dto.title,
        relatedPropertyId: dto.relatedPropertyId,
        relatedListingSnapshot:
          dto.type === 'direct' ? null : (dto.relatedListingSnapshot ?? null),
      }),
    );
    const participants = [userId];
    if (dto.peerUserId) {
      participants.push(dto.peerUserId);
    }
    await this.participantRepository.save(
      participants.map((participantId) =>
        this.participantRepository.create({
          threadId: thread.id,
          userId: participantId,
        }),
      ),
    );

    const created = await this.threadRepository.findOneOrFail({
      where: { id: thread.id },
      relations: {
        participants: { user: true },
        relatedProperty: { images: true },
      },
    });
    return this.toThreadSummary(created, userId);
  }

  /**
   * Persist a message, dedupe by (authorId, clientId), bump unread counters
   * for everyone except the sender, and touch the thread — all in one
   * transaction so a partial failure cannot leave counters drifted.
   *
   * Returns the canonical message DTO (whether freshly inserted or a dedup
   * hit on a prior identical clientId), so callers can use the same value
   * for both the ack and the broadcast.
   */
  async sendMessage(
    userId: string,
    threadId: string,
    body: string,
    clientId?: string,
    locationContext?: ChatLocationRefDto,
    imageUrl?: string,
    communityPostContext?: {
      id: string;
      title: string;
      description: string;
      city: string;
      images: string[];
      authorId: string;
      authorName?: string | null;
      authorAvatarUrl?: string | null;
    },
    replyToCommunityMessage?: ReplyToCommunityMessageDto,
  ): Promise<ChatMessageDto> {
    await this.assertMembership(userId, threadId);
    const cleanBody = typeof body === 'string' ? body.trim() : '';
    if (!cleanBody) {
      throw new BadRequestException('Message body is required');
    }

    // UGC safety: in a direct thread, a blocked relationship (either way)
    // stops further messages — covers both REST and socket send paths.
    const thread = await this.threadRepository.findOne({
      where: { id: threadId },
      select: { id: true, type: true },
    });
    if (thread?.type === 'direct') {
      const participantIds = await this.listParticipantUserIds(threadId);
      const peerId = participantIds.find((id) => id !== userId);
      if (
        peerId &&
        (await this.moderationService.isBlockedEitherWay(userId, peerId))
      ) {
        throw new ForbiddenException('You can no longer message this user');
      }
    }
    const cleanClientId = clientId?.trim() || null;
    const cleanLocation = sanitizeLocationContext(locationContext);
    const cleanImageUrl =
      typeof imageUrl === 'string' && imageUrl.trim()
        ? imageUrl.trim().slice(0, 2048)
        : null;
    const cleanReplyToCommunityMessage = sanitizeReplyToCommunityMessage(
      replyToCommunityMessage,
    );

    const messageId = await this.dataSource.transaction(async (manager) => {
      if (cleanClientId) {
        const existing = await manager.findOne(ChatMessageEntity, {
          where: { authorId: userId, clientId: cleanClientId },
          select: { id: true, threadId: true },
        });
        if (existing) {
          if (existing.threadId !== threadId) {
            throw new BadRequestException(
              'clientId already used in another thread',
            );
          }
          return existing.id;
        }
      }
      const created = await manager.save(
        manager.create(ChatMessageEntity, {
          threadId,
          authorId: userId,
          body: cleanBody,
          clientId: cleanClientId,
          locationContext: cleanLocation,
          imageUrl: cleanImageUrl,
          communityPostContext: communityPostContext ?? null,
          replyToCommunityMessage: cleanReplyToCommunityMessage,
        }),
      );

      // Sender just sent a message — they've implicitly read it.
      await manager.update(
        ChatParticipantEntity,
        { threadId, userId },
        { lastReadAt: new Date(), unreadCount: 0 },
      );
      /**
       * Raw SQL avoids TypeORM `increment` quirks with compound WHERE +
       * quoted PG columns. Also clears `hiddenAt` for every other
       * participant — if they'd previously "deleted" this chat from their
       * inbox, a fresh incoming message brings it back, same as WhatsApp.
       */
      await manager.query(
        `
        UPDATE "chat_participants"
        SET "unreadCount" = COALESCE("unreadCount", 0) + 1, "hiddenAt" = NULL
        WHERE "threadId" = $1 AND "userId" <> $2
        `,
        [threadId, userId],
      );
      // updatedAt drives thread list ordering — keep it in the same tx.
      await manager.update(ChatThreadEntity, threadId, {
        updatedAt: new Date(),
      });
      return created.id;
    });

    const hydrated = await this.messageRepository.findOneOrFail({
      where: { id: messageId },
      relations: {
        author: true,
        thread: { relatedProperty: { images: true } },
      },
    });
    return this.toMessageDto(hydrated, true);
  }

  /**
   * Mark `threadId` as read by `userId` and return the timestamp used.
   * Used by the gateway on `thread:join` / `message:read`, by the HTTP
   * `listMessages` handler, and by send (sender implicitly reads).
   *
   * Returns null when the user isn't a participant — caller decides how to
   * react. We don't throw here because read-marking is fire-and-forget on
   * the socket path and the controller has already asserted membership.
   */
  async markThreadRead(userId: string, threadId: string): Promise<Date | null> {
    const readAt = new Date();
    const result = await this.participantRepository.update(
      { threadId, userId },
      { lastReadAt: readAt, unreadCount: 0 },
    );
    if (!result.affected) {
      return null;
    }
    return readAt;
  }

  async assertMembership(userId: string, threadId: string) {
    const isMember = await this.isMember(userId, threadId);
    if (!isMember) {
      throw new ForbiddenException('You are not a participant in this thread');
    }
  }

  async isMember(userId: string, threadId: string): Promise<boolean> {
    // `exists()` short-circuits as soon as PG finds a matching row. Cheaper
    // than `count()` (which scans every matching row) on hot paths like
    // typing/read-receipt events that fire on every keystroke.
    return this.participantRepository.exists({
      where: { threadId, userId },
    });
  }

  async getThreadSummaryForUser(threadId: string, userId: string) {
    const thread = await this.threadRepository.findOneOrFail({
      where: { id: threadId },
      relations: {
        participants: { user: true },
        relatedProperty: { images: true },
      },
    });
    return this.toThreadSummary(thread, userId);
  }

  async listParticipantUserIds(threadId: string) {
    const participants = await this.participantRepository.find({
      where: { threadId },
      select: { userId: true },
    });
    return participants.map((participant) => participant.userId);
  }

  private async findDirectThreadBetweenUsers(
    userId: string,
    peerUserId: string,
  ) {
    const qb = this.threadRepository
      .createQueryBuilder('thread')
      .innerJoin('thread.participants', 'p1', 'p1.userId = :userId', { userId })
      .innerJoin('thread.participants', 'p2', 'p2.userId = :peerUserId', {
        peerUserId,
      })
      .leftJoinAndSelect('thread.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'participantUser')
      .leftJoinAndSelect('thread.relatedProperty', 'relatedProperty')
      .leftJoinAndSelect('relatedProperty.images', 'relatedPropertyImages')
      .where('thread.type = :type', { type: 'direct' })
      .andWhere((subQb: SelectQueryBuilder<ChatThreadEntity>) => {
        const subquery = subQb
          .subQuery()
          .select('COUNT(cp.id)')
          .from(ChatParticipantEntity, 'cp')
          .where('cp.threadId = thread.id')
          .getQuery();
        return `${subquery} = 2`;
      })
      .orderBy('thread.updatedAt', 'DESC');

    return qb.getOne();
  }

  private async toThreadSummary(thread: ChatThreadEntity, userId: string) {
    const [lastMessage, selfParticipant] = await Promise.all([
      this.messageRepository.findOne({
        where: { threadId: thread.id },
        order: { createdAt: 'DESC' },
      }),
      this.participantRepository.findOne({
        where: { threadId: thread.id, userId },
        select: { unreadCount: true },
      }),
    ]);
    return this.buildThreadSummary(thread, userId, {
      lastMessage: lastMessage ?? undefined,
      unreadCount: Math.max(0, selfParticipant?.unreadCount ?? 0),
    });
  }

  /**
   * Pure DTO builder — takes a thread plus already-fetched per-thread state
   * and returns the inbox summary. Used by the batched `listThreads` path
   * (one query per page) and by `toThreadSummary` (single-thread callers
   * like fan-out and join). Keeping the shape in one place guarantees the
   * two paths stay byte-for-byte identical.
   */
  private buildThreadSummary(
    thread: ChatThreadEntity,
    userId: string,
    state: { lastMessage?: ChatMessageEntity; unreadCount: number },
  ) {
    const peer = (thread.participants ?? []).find(
      (participant) => participant.userId !== userId,
    );
    return {
      id: thread.id,
      type: thread.type,
      title:
        thread.type === 'direct'
          ? (peer?.user?.displayName ?? thread.title)
          : thread.title,
      lastMessage: state.lastMessage?.body ?? 'Start the conversation',
      updatedAt: thread.updatedAt,
      unreadCount: state.unreadCount,
      peerUserId: peer?.userId,
      peerAvatarUrl: peer?.user?.avatarUrl ?? null,
      relatedListing: thread.relatedProperty
        ? this.toListingRef(thread.relatedProperty)
        : (thread.relatedListingSnapshot ?? undefined),
    };
  }

  private toMessageDto(
    message: ChatMessageEntity,
    includeListingContext = false,
  ): ChatMessageDto {
    // "Delete for everyone": content is already blanked server-side at
    // delete time, but this guard keeps the DTO honest even for rows that
    // predate that blanking (defensive, not load-bearing).
    if (message.isDeletedForEveryone) {
      return {
        id: message.id,
        threadId: message.threadId,
        authorId: message.authorId,
        authorName: message.author.displayName,
        authorAvatarUrl: message.author.avatarUrl ?? null,
        body: '',
        createdAt: message.createdAt,
        clientId: message.clientId,
        imageUrl: null,
        communityPostContext: null,
        replyToCommunityMessage: message.replyToCommunityMessage ?? null,
        isDeletedForEveryone: true,
      };
    }
    return {
      id: message.id,
      threadId: message.threadId,
      authorId: message.authorId,
      authorName: message.author.displayName,
      authorAvatarUrl: message.author.avatarUrl ?? null,
      body: message.body,
      createdAt: message.createdAt,
      clientId: message.clientId,
      listingContext:
        includeListingContext && message.thread?.relatedProperty
          ? this.toListingRef(message.thread.relatedProperty)
          : undefined,
      locationContext: message.locationContext
        ? {
            latitude: message.locationContext.latitude,
            longitude: message.locationContext.longitude,
            label: message.locationContext.label ?? null,
          }
        : undefined,
      imageUrl: message.imageUrl ?? null,
      communityPostContext: message.communityPostContext ?? null,
      replyToCommunityMessage: message.replyToCommunityMessage ?? null,
      isDeletedForEveryone: false,
    };
  }

  /** "Clear all messages": hides everything up to now from this user's own view only. */
  async clearThreadForUser(userId: string, threadId: string) {
    await this.assertMembership(userId, threadId);
    const clearedAt = new Date();
    await this.participantRepository.update(
      { threadId, userId },
      { clearedAt },
    );
    return { success: true, clearedAt };
  }

  /**
   * "Delete chat" — removes the thread from this user's own inbox list
   * only. Nothing is deleted for the other participant(s); the messages
   * and thread row are untouched. See `hiddenAt` on ChatParticipantEntity.
   */
  async hideThreadForUser(userId: string, threadId: string) {
    await this.assertMembership(userId, threadId);
    const hiddenAt = new Date();
    await this.participantRepository.update({ threadId, userId }, { hiddenAt });
    return { success: true, hiddenAt };
  }

  /**
   * "Delete for me": hides the message from the requesting user's list only.
   * Works on any message the user can see (their own or a peer's) — the
   * thread membership check is what gates access.
   */
  async deleteMessageForMe(userId: string, messageId: string) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      select: { id: true, threadId: true, deletedForUserIds: true },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    await this.assertMembership(userId, message.threadId);
    const current = new Set(message.deletedForUserIds ?? []);
    current.add(userId);
    await this.messageRepository.update(
      { id: messageId },
      { deletedForUserIds: Array.from(current) },
    );
    return { success: true, threadId: message.threadId };
  }

  /**
   * "Delete for everyone": author-only. Blanks the message content so it's
   * gone from storage for both sides, but keeps the row so ordering/ids
   * stay stable — clients render a "message deleted" placeholder.
   */
  async deleteMessageForEveryone(userId: string, messageId: string) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      select: { id: true, threadId: true, authorId: true },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.authorId !== userId) {
      throw new ForbiddenException(
        'Only the sender can delete this for everyone',
      );
    }
    await this.messageRepository.update(
      { id: messageId },
      {
        body: '',
        imageUrl: null,
        locationContext: null,
        communityPostContext: null,
        replyToCommunityMessage: null,
        isDeletedForEveryone: true,
        deletedAt: new Date(),
      },
    );
    return { success: true, threadId: message.threadId };
  }

  /**
   * Admin oversight: list every direct (1-to-1) thread platform-wide with
   * both participants' identities and a last-message preview — this is
   * what lets an admin see "who is talking to whom" without needing either
   * user's own membership/perspective (unlike `listThreads`, which is
   * scoped to one user's inbox). Group/community threads are excluded
   * here; there's no "who's it between" for those, and they're already
   * visible via the Communities admin page.
   */
  async adminListDirectThreads(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.threadRepository
      .createQueryBuilder('thread')
      .where('thread.type = :type', { type: 'direct' })
      .leftJoinAndSelect('thread.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'participantUser')
      .orderBy('thread.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    // Optional search: match either participant's name or email, so an
    // admin can jump straight to a specific user's conversations.
    if (query.search) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM chat_participants cp
          INNER JOIN users u ON u.id = cp."userId"
          WHERE cp."threadId" = thread.id
            AND (u."displayName" ILIKE :search OR u.email ILIKE :search)
        )`,
        { search: `%${query.search}%` },
      );
    }

    const [threads, total] = await qb.getManyAndCount();
    if (threads.length === 0) {
      return { items: [], pagination: { page, limit, total, hasNext: false } };
    }

    const threadIds = threads.map((t) => t.id);
    const lastMessages = await this.findLastMessagesForThreads(threadIds);
    const lastMessageByThreadId = new Map(
      lastMessages.map((m) => [m.threadId, m]),
    );
    const messageCounts = await this.messageRepository
      .createQueryBuilder('m')
      .select('m."threadId"', 'threadId')
      .addSelect('COUNT(*)', 'count')
      .where('m."threadId" IN (:...threadIds)', { threadIds })
      .groupBy('m."threadId"')
      .getRawMany<{ threadId: string; count: string }>();
    const countByThreadId = new Map(
      messageCounts.map((r) => [r.threadId, Number(r.count)]),
    );

    return {
      items: threads.map((thread) => {
        const last = lastMessageByThreadId.get(thread.id);
        return {
          id: thread.id,
          participants: (thread.participants ?? []).map((p) => ({
            id: p.user?.id,
            displayName: p.user?.displayName ?? 'Deleted user',
            email: p.user?.email ?? null,
            avatarUrl: p.user?.avatarUrl ?? null,
            isBlocked: p.user?.isBlocked ?? false,
          })),
          lastMessage: last
            ? {
                body: last.isDeletedForEveryone ? '' : last.body,
                imageUrl: last.isDeletedForEveryone ? null : last.imageUrl,
                createdAt: last.createdAt,
                authorId: last.authorId,
              }
            : null,
          messageCount: countByThreadId.get(thread.id) ?? 0,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
        };
      }),
      pagination: { page, limit, total, hasNext: page * limit < total },
    };
  }

  /**
   * Admin oversight: raw, unfiltered message history for any thread. Unlike
   * `listMessages`, this ignores per-user `clearedAt`/block filtering —
   * admins need to see the actual full conversation as it happened for
   * moderation/dispute review, not any one participant's edited view.
   */
  async adminListThreadMessages(threadId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const [messagesDesc, total] = await this.messageRepository.findAndCount({
      where: { threadId },
      relations: { author: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const chronological = [...messagesDesc].reverse();

    return {
      items: chronological.map((message) => this.toMessageDto(message)),
      pagination: { page, limit, total, hasNext: page * limit < total },
    };
  }

  /**
   * Admin action: permanently wipe every message in every community (group)
   * thread from Postgres. Threads, participants, and user profiles are left
   * untouched — only `chat_messages` rows for `type = 'group'` threads are
   * removed, so the community itself keeps existing and simply starts empty.
   */
  async adminDeleteAllCommunityMessages(): Promise<{ deleted: number }> {
    return this.adminDeleteMessagesForThreadType('group');
  }

  /**
   * Admin action: permanently wipe every message in every private (direct)
   * thread from Postgres — every user's DM history is cleared. User
   * accounts, their profiles, and the thread rows themselves are left
   * intact, so any two users can carry on messaging each other afterwards
   * exactly as before (they just start with a clean history).
   */
  async adminDeleteAllPrivateMessages(): Promise<{ deleted: number }> {
    return this.adminDeleteMessagesForThreadType('direct');
  }

  private async adminDeleteMessagesForThreadType(
    type: 'group' | 'direct',
  ): Promise<{ deleted: number }> {
    const threads = await this.threadRepository
      .createQueryBuilder('thread')
      .select('thread.id', 'id')
      .where('thread.type = :type', { type })
      .getRawMany<{ id: string }>();
    const ids = threads.map((r) => r.id);
    if (ids.length === 0) {
      return { deleted: 0 };
    }
    // Hard delete — actual row removal, not a soft/hide flag, so storage is
    // freed and nothing lingers in the database.
    const result = await this.messageRepository.delete({ threadId: In(ids) });
    // Reset unread counters / clear per-user hide flags so the now-empty
    // threads don't show stale badges or stay hidden for anyone.
    await this.participantRepository
      .createQueryBuilder()
      .update(ChatParticipantEntity)
      .set({ unreadCount: 0, clearedAt: null, hiddenAt: null })
      .where('"threadId" IN (:...ids)', { ids })
      .execute();
    return { deleted: result.affected ?? 0 };
  }

  private toListingRef(property: PropertyEntity): ChatListingRefDto {
    const image = [...(property.images ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    )[0];
    return {
      id: property.id,
      title: property.title,
      imageUrl: image?.url ?? '',
      location: property.location,
      priceMonthly: Number(property.priceMonthly),
    };
  }
}

//comment data 1

// import {
//   BadRequestException,
//   ForbiddenException,
//   Injectable,
//   NotFoundException,
// } from '@nestjs/common';
// import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
// import { DataSource, In, Repository, SelectQueryBuilder } from 'typeorm';
// import { ChatThreadEntity } from './entities/chat-thread.entity';
// import { ChatParticipantEntity } from './entities/chat-participant.entity';
// import { ChatMessageEntity } from './entities/chat-message.entity';
// import { ListMessageQueryDto } from './dto/list-message-query.dto';
// import { ListThreadQueryDto } from './dto/list-thread-query.dto';
// import { CreateThreadDto } from './dto/create-thread.dto';
// import { PropertyEntity } from '../properties/entities/property.entity';
// import { ModerationService } from '../moderation/moderation.service';

// const COMMON_THREAD_TITLE = 'Brokage Community';

// /**
//  * Defensive normalizer so a bad payload that slipped past validation (or a
//  * non-controller caller) can't write garbage into JSONB. Drops the attachment
//  * entirely when latitude/longitude aren't finite numbers in range.
//  */
// function sanitizeLocationContext(
//   raw: ChatLocationRefDto | undefined,
// ): ChatLocationRefDto | null {
//   if (!raw) {
//     return null;
//   }
//   const { latitude, longitude, label } = raw;
//   if (
//     typeof latitude !== 'number' ||
//     typeof longitude !== 'number' ||
//     !Number.isFinite(latitude) ||
//     !Number.isFinite(longitude) ||
//     latitude < -90 ||
//     latitude > 90 ||
//     longitude < -180 ||
//     longitude > 180
//   ) {
//     return null;
//   }
//   return {
//     latitude,
//     longitude,
//     label: typeof label === 'string' ? label.slice(0, 255) : null,
//   };
// }

// export type ChatListingRefDto = {
//   id: string;
//   title: string;
//   imageUrl: string;
//   location: string;
//   priceMonthly: number;
// };

// export type ChatLocationRefDto = {
//   latitude: number;
//   longitude: number;
//   label?: string | null;
// };

// export type ChatMessageDto = {
//   id: string;
//   threadId: string;
//   authorId: string;
//   authorName: string;
//   /** URL of the author's avatar — needed by group chats to identify the
//    *  sender visually. `null` when the user hasn't uploaded one. */
//   authorAvatarUrl: string | null;
//   body: string;
//   createdAt: Date;
//   clientId?: string | null;
//   listingContext?: ChatListingRefDto;
//   locationContext?: ChatLocationRefDto;
//   imageUrl?: string | null;
// };

// @Injectable()
// export class ChatsService {
//   constructor(
//     @InjectRepository(ChatThreadEntity)
//     private readonly threadRepository: Repository<ChatThreadEntity>,
//     @InjectRepository(ChatParticipantEntity)
//     private readonly participantRepository: Repository<ChatParticipantEntity>,
//     @InjectRepository(ChatMessageEntity)
//     private readonly messageRepository: Repository<ChatMessageEntity>,
//     @InjectDataSource()
//     private readonly dataSource: DataSource,
//     private readonly moderationService: ModerationService,
//   ) {}

//   async ensureUserInGlobalThread(userId: string) {
//     let thread = await this.threadRepository.findOne({
//       where: { type: 'group', title: COMMON_THREAD_TITLE },
//     });
//     if (!thread) {
//       thread = await this.threadRepository.save(
//         this.threadRepository.create({
//           type: 'group',
//           title: COMMON_THREAD_TITLE,
//         }),
//       );
//     }

//     const membership = await this.participantRepository.findOne({
//       where: { threadId: thread.id, userId },
//     });
//     if (!membership) {
//       await this.participantRepository.save(
//         this.participantRepository.create({ threadId: thread.id, userId }),
//       );
//     }
//     return thread;
//   }

//   async listThreads(userId: string, query: ListThreadQueryDto) {
//     // Ensure the user is in the default group thread
//     await this.ensureUserInGlobalThread(userId);

//     const page = query.page ?? 1;
//     const limit = query.limit ?? 20;

//     const qb = this.threadRepository
//       .createQueryBuilder('thread')
//       .innerJoin(
//         'thread.participants',
//         'participant',
//         'participant.userId = :userId',
//         {
//           userId,
//         },
//       )
//       .leftJoinAndSelect('thread.participants', 'participants')
//       .leftJoinAndSelect('participants.user', 'participantUser')
//       .leftJoinAndSelect('thread.relatedProperty', 'relatedProperty')
//       .leftJoinAndSelect('relatedProperty.images', 'relatedPropertyImages')
//       .orderBy('thread.updatedAt', 'DESC')
//       .skip((page - 1) * limit)
//       .take(limit);

//     const [threads, total] = await qb.getManyAndCount();
//     if (threads.length === 0) {
//       return {
//         items: [],
//         pagination: { page, limit, total, hasNext: false },
//       };
//     }

//     // Previously: per-thread `findOne` for last message + self-participant
//     // → 2N queries per page. Now: two batched lookups regardless of page size.
//     const threadIds = threads.map((thread) => thread.id);
//     const [lastMessages, selfParticipants] = await Promise.all([
//       this.findLastMessagesForThreads(threadIds),
//       this.participantRepository.find({
//         where: { threadId: In(threadIds), userId },
//         select: { threadId: true, unreadCount: true },
//       }),
//     ]);
//     const lastMessageByThreadId = new Map<string, ChatMessageEntity>(
//       lastMessages.map((message) => [message.threadId, message]),
//     );
//     const unreadByThreadId = new Map<string, number>(
//       selfParticipants.map((participant) => [
//         participant.threadId,
//         Math.max(0, participant.unreadCount ?? 0),
//       ]),
//     );

//     return {
//       items: threads.map((thread) =>
//         this.buildThreadSummary(thread, userId, {
//           lastMessage: lastMessageByThreadId.get(thread.id),
//           unreadCount: unreadByThreadId.get(thread.id) ?? 0,
//         }),
//       ),
//       pagination: { page, limit, total, hasNext: page * limit < total },
//     };
//   }

//   /**
//    * Fetch the most recent message for each thread in `threadIds` using a
//    * `DISTINCT ON` window — one round-trip regardless of how many threads
//    * are on the page. PG's planner uses `(threadId, createdAt DESC)` if
//    * indexed; today this still works (it falls back to a sort) and is the
//    * place to add a composite index when traffic justifies it.
//    */
//   private async findLastMessagesForThreads(
//     threadIds: string[],
//   ): Promise<ChatMessageEntity[]> {
//     if (threadIds.length === 0) {
//       return [];
//     }
//     return this.messageRepository
//       .createQueryBuilder('message')
//       .distinctOn(['message.threadId'])
//       .where('message.threadId IN (:...threadIds)', { threadIds })
//       .orderBy('message.threadId')
//       .addOrderBy('message.createdAt', 'DESC')
//       .getMany();
//   }

//   async listMessages(
//     userId: string,
//     threadId: string,
//     query: ListMessageQueryDto,
//   ) {
//     await this.assertMembership(userId, threadId);
//     const page = query.page ?? 1;
//     const limit = query.limit ?? 50;

//     /**
//      * Newest-first pages (chat UX): page 1 = latest `limit` messages.
//      * TypeORM returns DESC rows; reverse so API items stay chronological
//      * (oldest→newest) within each page for clients.
//      */
//     const [messagesDesc, total] = await this.messageRepository.findAndCount({
//       where: { threadId },
//       relations: { author: true },
//       order: { createdAt: 'DESC' },
//       skip: (page - 1) * limit,
//       take: limit,
//     });
//     const chronological = [...messagesDesc].reverse();

//     await this.markThreadRead(userId, threadId);

//     // UGC safety: hide messages authored by users this user has blocked.
//     const blockedIds = new Set(
//       await this.moderationService.getBlockedUserIds(userId),
//     );
//     const visible = blockedIds.size
//       ? chronological.filter((message) => !blockedIds.has(message.authorId))
//       : chronological;

//     return {
//       items: visible.map((message) => this.toMessageDto(message)),
//       pagination: { page, limit, total, hasNext: page * limit < total },
//     };
//   }

//   async createThread(userId: string, dto: CreateThreadDto) {
//     if (dto.type === 'direct' && !dto.peerUserId) {
//       throw new NotFoundException('peerUserId is required for direct chats');
//     }

//     if (dto.type === 'direct' && dto.peerUserId) {
//       // UGC safety: a blocked relationship (either direction) cannot open a DM.
//       if (
//         await this.moderationService.isBlockedEitherWay(
//           userId,
//           dto.peerUserId,
//         )
//       ) {
//         throw new ForbiddenException(
//           'You cannot start a conversation with this user',
//         );
//       }
//       const existing = await this.findDirectThreadBetweenUsers(
//         userId,
//         dto.peerUserId,
//       );
//       if (existing) {
//         return this.toThreadSummary(existing, userId);
//       }
//     }

//     const thread = await this.threadRepository.save(
//       this.threadRepository.create({
//         type: dto.type,
//         title: dto.title,
//         relatedPropertyId: dto.relatedPropertyId,
//       }),
//     );
//     const participants = [userId];
//     if (dto.peerUserId) {
//       participants.push(dto.peerUserId);
//     }
//     await this.participantRepository.save(
//       participants.map((participantId) =>
//         this.participantRepository.create({
//           threadId: thread.id,
//           userId: participantId,
//         }),
//       ),
//     );

//     const created = await this.threadRepository.findOneOrFail({
//       where: { id: thread.id },
//       relations: {
//         participants: { user: true },
//         relatedProperty: { images: true },
//       },
//     });
//     return this.toThreadSummary(created, userId);
//   }

//   /**
//    * Persist a message, dedupe by (authorId, clientId), bump unread counters
//    * for everyone except the sender, and touch the thread — all in one
//    * transaction so a partial failure cannot leave counters drifted.
//    *
//    * Returns the canonical message DTO (whether freshly inserted or a dedup
//    * hit on a prior identical clientId), so callers can use the same value
//    * for both the ack and the broadcast.
//    */
//   async sendMessage(
//     userId: string,
//     threadId: string,
//     body: string,
//     clientId?: string,
//     locationContext?: ChatLocationRefDto,
//     imageUrl?: string,
//   ): Promise<ChatMessageDto> {
//     await this.assertMembership(userId, threadId);
//     const cleanBody = typeof body === 'string' ? body.trim() : '';
//     if (!cleanBody) {
//       throw new BadRequestException('Message body is required');
//     }

//     // UGC safety: in a direct thread, a blocked relationship (either way)
//     // stops further messages — covers both REST and socket send paths.
//     const thread = await this.threadRepository.findOne({
//       where: { id: threadId },
//       select: { id: true, type: true },
//     });
//     if (thread?.type === 'direct') {
//       const participantIds = await this.listParticipantUserIds(threadId);
//       const peerId = participantIds.find((id) => id !== userId);
//       if (
//         peerId &&
//         (await this.moderationService.isBlockedEitherWay(userId, peerId))
//       ) {
//         throw new ForbiddenException('You can no longer message this user');
//       }
//     }
//     const cleanClientId = clientId?.trim() || null;
//     const cleanLocation = sanitizeLocationContext(locationContext);
//     const cleanImageUrl =
//   typeof imageUrl === 'string' && imageUrl.trim()
//     ? imageUrl.trim().slice(0, 2048)
//     : null;

//     const messageId = await this.dataSource.transaction(async (manager) => {
//       if (cleanClientId) {
//         const existing = await manager.findOne(ChatMessageEntity, {
//           where: { authorId: userId, clientId: cleanClientId },
//           select: { id: true, threadId: true },
//         });
//         if (existing) {
//           if (existing.threadId !== threadId) {
//             throw new BadRequestException(
//               'clientId already used in another thread',
//             );
//           }
//           return existing.id;
//         }
//       }
//       const created = await manager.save(
//         manager.create(ChatMessageEntity, {
//           threadId,
//           authorId: userId,
//           body: cleanBody,
//           clientId: cleanClientId,
//           locationContext: cleanLocation,
//            imageUrl: cleanImageUrl,
//         }),
//       );

//       // Sender just sent a message — they've implicitly read it.
//       await manager.update(
//         ChatParticipantEntity,
//         { threadId, userId },
//         { lastReadAt: new Date(), unreadCount: 0 },
//       );
//       /** Raw SQL avoids TypeORM `increment` quirks with compound WHERE + quoted PG columns. */
//       await manager.query(
//         `
//         UPDATE "chat_participants"
//         SET "unreadCount" = COALESCE("unreadCount", 0) + 1
//         WHERE "threadId" = $1 AND "userId" <> $2
//         `,
//         [threadId, userId],
//       );
//       // updatedAt drives thread list ordering — keep it in the same tx.
//       await manager.update(ChatThreadEntity, threadId, {
//         updatedAt: new Date(),
//       });
//       return created.id;
//     });

//     const hydrated = await this.messageRepository.findOneOrFail({
//       where: { id: messageId },
//       relations: {
//         author: true,
//         thread: { relatedProperty: { images: true } },
//       },
//     });
//     return this.toMessageDto(hydrated, true);
//   }

//   /**
//    * Mark `threadId` as read by `userId` and return the timestamp used.
//    * Used by the gateway on `thread:join` / `message:read`, by the HTTP
//    * `listMessages` handler, and by send (sender implicitly reads).
//    *
//    * Returns null when the user isn't a participant — caller decides how to
//    * react. We don't throw here because read-marking is fire-and-forget on
//    * the socket path and the controller has already asserted membership.
//    */
//   async markThreadRead(userId: string, threadId: string): Promise<Date | null> {
//     const readAt = new Date();
//     const result = await this.participantRepository.update(
//       { threadId, userId },
//       { lastReadAt: readAt, unreadCount: 0 },
//     );
//     if (!result.affected) {
//       return null;
//     }
//     return readAt;
//   }

//   async assertMembership(userId: string, threadId: string) {
//     const isMember = await this.isMember(userId, threadId);
//     if (!isMember) {
//       throw new ForbiddenException('You are not a participant in this thread');
//     }
//   }

//   async isMember(userId: string, threadId: string): Promise<boolean> {
//     // `exists()` short-circuits as soon as PG finds a matching row. Cheaper
//     // than `count()` (which scans every matching row) on hot paths like
//     // typing/read-receipt events that fire on every keystroke.
//     return this.participantRepository.exists({
//       where: { threadId, userId },
//     });
//   }

//   async getThreadSummaryForUser(threadId: string, userId: string) {
//     const thread = await this.threadRepository.findOneOrFail({
//       where: { id: threadId },
//       relations: {
//         participants: { user: true },
//         relatedProperty: { images: true },
//       },
//     });
//     return this.toThreadSummary(thread, userId);
//   }

//   async listParticipantUserIds(threadId: string) {
//     const participants = await this.participantRepository.find({
//       where: { threadId },
//       select: { userId: true },
//     });
//     return participants.map((participant) => participant.userId);
//   }

//   private async findDirectThreadBetweenUsers(
//     userId: string,
//     peerUserId: string,
//   ) {
//     const qb = this.threadRepository
//       .createQueryBuilder('thread')
//       .innerJoin('thread.participants', 'p1', 'p1.userId = :userId', { userId })
//       .innerJoin('thread.participants', 'p2', 'p2.userId = :peerUserId', {
//         peerUserId,
//       })
//       .leftJoinAndSelect('thread.participants', 'participants')
//       .leftJoinAndSelect('participants.user', 'participantUser')
//       .leftJoinAndSelect('thread.relatedProperty', 'relatedProperty')
//       .leftJoinAndSelect('relatedProperty.images', 'relatedPropertyImages')
//       .where('thread.type = :type', { type: 'direct' })
//       .andWhere((subQb: SelectQueryBuilder<ChatThreadEntity>) => {
//         const subquery = subQb
//           .subQuery()
//           .select('COUNT(cp.id)')
//           .from(ChatParticipantEntity, 'cp')
//           .where('cp.threadId = thread.id')
//           .getQuery();
//         return `${subquery} = 2`;
//       })
//       .orderBy('thread.updatedAt', 'DESC');

//     return qb.getOne();
//   }

//   private async toThreadSummary(thread: ChatThreadEntity, userId: string) {
//     const [lastMessage, selfParticipant] = await Promise.all([
//       this.messageRepository.findOne({
//         where: { threadId: thread.id },
//         order: { createdAt: 'DESC' },
//       }),
//       this.participantRepository.findOne({
//         where: { threadId: thread.id, userId },
//         select: { unreadCount: true },
//       }),
//     ]);
//     return this.buildThreadSummary(thread, userId, {
//       lastMessage: lastMessage ?? undefined,
//       unreadCount: Math.max(0, selfParticipant?.unreadCount ?? 0),
//     });
//   }

//   /**
//    * Pure DTO builder — takes a thread plus already-fetched per-thread state
//    * and returns the inbox summary. Used by the batched `listThreads` path
//    * (one query per page) and by `toThreadSummary` (single-thread callers
//    * like fan-out and join). Keeping the shape in one place guarantees the
//    * two paths stay byte-for-byte identical.
//    */
//   private buildThreadSummary(
//     thread: ChatThreadEntity,
//     userId: string,
//     state: { lastMessage?: ChatMessageEntity; unreadCount: number },
//   ) {
//     const peer = (thread.participants ?? []).find(
//       (participant) => participant.userId !== userId,
//     );
//     return {
//       id: thread.id,
//       type: thread.type,
//       title:
//         thread.type === 'direct'
//           ? (peer?.user?.displayName ?? thread.title)
//           : thread.title,
//       lastMessage: state.lastMessage?.body ?? 'Start the conversation',
//       updatedAt: thread.updatedAt,
//       unreadCount: state.unreadCount,
//       peerUserId: peer?.userId,
//       relatedListing: thread.relatedProperty
//         ? this.toListingRef(thread.relatedProperty)
//         : undefined,
//     };
//   }

//   private toMessageDto(
//     message: ChatMessageEntity,
//     includeListingContext = false,
//   ): ChatMessageDto {
//     return {
//       id: message.id,
//       threadId: message.threadId,
//       authorId: message.authorId,
//       authorName: message.author.displayName,
//       authorAvatarUrl: message.author.avatarUrl ?? null,
//       body: message.body,
//       createdAt: message.createdAt,
//       clientId: message.clientId,
//       listingContext:
//         includeListingContext && message.thread?.relatedProperty
//           ? this.toListingRef(message.thread.relatedProperty)
//           : undefined,
//       locationContext: message.locationContext
//         ? {
//             latitude: message.locationContext.latitude,
//             longitude: message.locationContext.longitude,
//             label: message.locationContext.label ?? null,
//           }
//         : undefined,
// imageUrl: message.imageUrl ?? null,

//     };
//   }

//   private toListingRef(property: PropertyEntity): ChatListingRefDto {
//     const image = [...(property.images ?? [])].sort(
//       (a, b) => a.sortOrder - b.sortOrder,
//     )[0];
//     return {
//       id: property.id,
//       title: property.title,
//       imageUrl: image?.url ?? '',
//       location: property.location,
//       priceMonthly: Number(property.priceMonthly),
//     };
//   }
// }
