import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds columns needed for:
 *  - "Clear all messages" (per-user, thread-scoped) — `chat_participants.clearedAt`.
 *    Messages created before this timestamp are hidden from that user's
 *    message list only; the other participant's view is unaffected.
 *  - "Delete for me" — `chat_messages.deletedForUserIds` (jsonb array of user
 *    ids). A message is hidden entirely from any user whose id is in this
 *    array; it stays untouched for everyone else.
 *  - "Delete for everyone" — `chat_messages.isDeletedForEveryone` +
 *    `deletedAt`. Author-only action; the message row is kept (for id/order
 *    continuity) but its content is blanked server-side and clients render
 *    a "This message was deleted" placeholder for both sides.
 */
export class AddChatClearAndDeleteSupport1787200000000
  implements MigrationInterface
{
  name = 'AddChatClearAndDeleteSupport1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_participants"
      ADD COLUMN IF NOT EXISTS "clearedAt" TIMESTAMP
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      ADD COLUMN IF NOT EXISTS "deletedForUserIds" jsonb NOT NULL DEFAULT '[]'
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      ADD COLUMN IF NOT EXISTS "isDeletedForEveryone" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "deletedAt"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "isDeletedForEveryone"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "deletedForUserIds"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_participants" DROP COLUMN IF EXISTS "clearedAt"
    `);
  }
}
