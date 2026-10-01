import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `chat_messages` was missing two indexes that matter a lot once a thread
 * (especially the global community thread, which every user is auto-joined
 * to at signup) has real volume:
 *
 * 1. Composite (threadId, createdAt DESC) — used by `listMessages`'
 *    pagination and by `findLastMessagesForThreads`' `DISTINCT ON` query.
 *    Without it, Postgres falls back to a sort over every message in the
 *    thread on every page load / last-message lookup.
 *
 * 2. Plain (createdAt) — used by `ChatRetentionService`'s hourly sweep
 *    (`DELETE FROM chat_messages WHERE "createdAt" < :cutoff`), which was
 *    previously doing a full table scan every hour.
 */
export class AddChatMessageIndexes1788100000000
  implements MigrationInterface
{
  name = 'AddChatMessageIndexes1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_messages_thread_createdAt"
      ON "chat_messages" ("threadId", "createdAt" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_messages_createdAt"
      ON "chat_messages" ("createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_chat_messages_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_chat_messages_thread_createdAt"`,
    );
  }
}
