import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatMessageClientId1777063000000 implements MigrationInterface {
  name = 'AddChatMessageClientId1777063000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      ADD COLUMN IF NOT EXISTS "clientId" varchar(64) NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_messages_clientId"
      ON "chat_messages" ("clientId")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_chat_messages_author_client"
      ON "chat_messages" ("authorId", "clientId")
      WHERE "clientId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_chat_messages_author_client"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_chat_messages_clientId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "clientId"`,
    );
  }
}
