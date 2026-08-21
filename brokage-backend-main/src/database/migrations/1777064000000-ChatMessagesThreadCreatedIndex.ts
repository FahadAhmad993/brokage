import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Speeds up newest-first pagination (`WHERE threadId = … ORDER BY createdAt DESC`)
 * and avoids sequential scans as threads grow.
 */
export class ChatMessagesThreadCreatedIndex1777064000000 implements MigrationInterface {
  name = 'ChatMessagesThreadCreatedIndex1777064000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_messages_threadId_createdAt"
      ON "chat_messages" ("threadId", "createdAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_chat_messages_threadId_createdAt"
    `);
  }
}
