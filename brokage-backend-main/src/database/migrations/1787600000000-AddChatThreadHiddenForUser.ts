import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Delete chat" from the inbox list — per-user, thread-scoped, same pattern
 * as `clearedAt` (see AddChatClearAndDeleteSupport). Setting
 * `chat_participants.hiddenAt` removes the thread from that user's
 * `GET /chats/threads` list only; the thread, its messages, and the other
 * participant's view are all untouched. If the peer sends a new message
 * afterwards, `hiddenAt` is cleared for the recipient so the thread
 * reappears — mirrors WhatsApp's "delete chat" behavior.
 */
export class AddChatThreadHiddenForUser1787600000000 implements MigrationInterface {
  name = 'AddChatThreadHiddenForUser1787600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_participants"
      ADD COLUMN IF NOT EXISTS "hiddenAt" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_participants" DROP COLUMN IF EXISTS "hiddenAt"
    `);
  }
}
