import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ChatMessageEntity } from './entities/chat-message.entity';
import { ChatThreadEntity } from './entities/chat-thread.entity';

const RETENTION_DAYS = 20;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
// Run once on boot, then daily. Deletes are cheap (indexed on createdAt via
// the thread/createdAt composite index) so a daily sweep is plenty.
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Hard-deletes chat messages (community and private alike) once they're
 * older than 20 days — rows are removed from Postgres entirely, not just
 * hidden, so storage is actually freed. This runs in addition to, not
 * instead of, "delete for me" / "delete for everyone": those act
 * immediately at the user's request, this is the unconditional backstop
 * that applies to every message regardless of who deleted what.
 *
 * The same daily sweep also hard-deletes communities whose 7-day
 * soft-delete restore window has passed (see `ChatThreadEntity.deletedAt`).
 * `onDelete: CASCADE` on messages/participants means removing the thread
 * row cleans up everything that belonged to it in one statement.
 */
@Injectable()
export class ChatRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatRetentionService.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    @InjectRepository(ChatMessageEntity)
    private readonly messageRepository: Repository<ChatMessageEntity>,
    @InjectRepository(ChatThreadEntity)
    private readonly threadRepository: Repository<ChatThreadEntity>,
  ) {}

  onModuleInit() {
    // Fire once shortly after boot, then on the fixed interval.
    setTimeout(() => void this.sweep(), 30_000);
    this.timer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async sweep() {
    try {
      const cutoff = new Date(Date.now() - RETENTION_MS);
      const result = await this.messageRepository.delete({
        createdAt: LessThan(cutoff),
      });
      if (result.affected) {
        this.logger.log(
          `Chat retention sweep: deleted ${result.affected} message(s) older than ${RETENTION_DAYS} days`,
        );
      }
    } catch (err) {
      this.logger.error('Chat retention sweep failed', err as Error);
    }

    try {
      const purged = await this.threadRepository.delete({
        type: 'group',
        restoreExpiresAt: LessThan(new Date()),
      });
      if (purged.affected) {
        this.logger.log(
          `Chat retention sweep: permanently removed ${purged.affected} community(ies) past their 7-day restore window`,
        );
      }
    } catch (err) {
      this.logger.error('Community purge sweep failed', err as Error);
    }
  }
}
