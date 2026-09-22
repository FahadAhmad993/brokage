import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets an admin change how many days a chat message (community OR private)
 * survives before `ChatRetentionService`'s daily sweep hard-deletes it.
 * Defaults to 20 to match the previous hardcoded behaviour.
 */
export class AddChatRetentionDaysSetting1787700000001 implements MigrationInterface {
  name = 'AddChatRetentionDaysSetting1787700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "app_settings"
      ADD COLUMN IF NOT EXISTS "chatRetentionDays" int NOT NULL DEFAULT 20
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "app_settings" DROP COLUMN IF EXISTS "chatRetentionDays"
    `);
  }
}
