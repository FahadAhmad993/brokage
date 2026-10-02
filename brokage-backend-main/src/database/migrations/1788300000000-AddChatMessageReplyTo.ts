import { MigrationInterface, QueryRunner } from 'typeorm';

/** In-thread reply quote (WhatsApp-style) on chat messages. */
export class AddChatMessageReplyTo1788300000000 implements MigrationInterface {
  name = 'AddChatMessageReplyTo1788300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "replyTo" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "replyTo"`,
    );
  }
}
