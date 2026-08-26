import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * "Reply Privately" (WhatsApp-style): when a user taps another member's
 * community/group message, we open (or reuse) the private DM with that
 * member and let the sender type a fresh reply. This column stores a frozen
 * snapshot of the ORIGINAL community message being replied to, so the
 * quoted message can be rendered as its own preview block above the reply
 * bubble — the community message text is never copied into the outgoing
 * message's own `body`.
 */
export class AddReplyToCommunityMessage1787700000000
  implements MigrationInterface
{
  name = 'AddReplyToCommunityMessage1787700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      ADD COLUMN IF NOT EXISTS "replyToCommunityMessage" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "replyToCommunityMessage"
    `);
  }
}
