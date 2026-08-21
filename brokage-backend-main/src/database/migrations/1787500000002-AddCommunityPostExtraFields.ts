import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `extraFields` — free-form answers to whatever custom fields an admin has
 * added via `app_settings.customFields` (e.g. "Bedrooms", "Furnished?").
 * Kept as jsonb (key -> string) rather than real columns since the field
 * list is admin-editable at runtime, not fixed at migration time.
 */
export class AddCommunityPostExtraFields1787500000002 implements MigrationInterface {
  name = 'AddCommunityPostExtraFields1787500000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "community_posts"
      ADD COLUMN IF NOT EXISTS "extraFields" jsonb NOT NULL DEFAULT '{}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "community_posts" DROP COLUMN IF EXISTS "extraFields"
    `);
  }
}
