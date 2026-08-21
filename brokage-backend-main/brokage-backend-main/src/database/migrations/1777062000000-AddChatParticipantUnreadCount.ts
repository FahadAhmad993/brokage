import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatParticipantUnreadCount1777062000000 implements MigrationInterface {
  name = 'AddChatParticipantUnreadCount1777062000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_participants"
      ADD COLUMN IF NOT EXISTS "unreadCount" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_participants" DROP COLUMN IF EXISTS "unreadCount"
    `);
  }
}
