import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Soft-delete for communities (group chat_threads). Deleting a community
 * from the admin panel doesn't drop the row immediately — it's flagged with
 * `deletedAt`/`restoreExpiresAt` so it can be restored, with all its
 * members/messages/ads intact, for 7 days. A background sweep
 * (ChatRetentionService) hard-deletes it once `restoreExpiresAt` passes.
 */
export class AddCommunitySoftDelete1787500000001 implements MigrationInterface {
  name = 'AddCommunitySoftDelete1787500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_threads"
      ADD COLUMN IF NOT EXISTS "deletedAt" timestamp,
      ADD COLUMN IF NOT EXISTS "restoreExpiresAt" timestamp,
      ADD COLUMN IF NOT EXISTS "deletedReason" text
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_threads_deletedAt" ON "chat_threads" ("deletedAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_threads_deletedAt"`);
    await queryRunner.query(`
      ALTER TABLE "chat_threads"
      DROP COLUMN IF EXISTS "deletedAt",
      DROP COLUMN IF EXISTS "restoreExpiresAt",
      DROP COLUMN IF EXISTS "deletedReason"
    `);
  }
}
