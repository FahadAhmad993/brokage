import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatMessageLocationContext1777065000000 implements MigrationInterface {
  name = 'AddChatMessageLocationContext1777065000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      ADD COLUMN IF NOT EXISTS "locationContext" jsonb NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "locationContext"`,
    );
  }
}
