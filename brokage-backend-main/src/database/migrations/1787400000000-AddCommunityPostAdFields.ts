import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Turns a community post into a proper "ad":
 *  - `area`            — neighbourhood/area text shown next to `city`.
 *  - `durationHours`    — how long the ad should stay live once approved
 *                          (user-selected or free-typed, e.g. 24 / 48 / 72).
 *  - `price`            — PKR amount charged for that duration. Computed
 *                          server-side from `durationHours`, never trusted
 *                          from the client.
 *  - `status`           — 'pending' (just submitted) -> 'active' (admin
 *                          verified, currently live) -> 'expired' (duration
 *                          elapsed) or 'rejected' (admin declined).
 *  - `verifiedAt`        — when an admin approved the ad.
 *  - `expiresAt`         — verifiedAt + durationHours; when it flips to
 *                          'expired' and stops showing to other users.
 *  - `rejectionReason`   — optional note shown to the user if declined.
 */
export class AddCommunityPostAdFields1787400000000 implements MigrationInterface {
  name = 'AddCommunityPostAdFields1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "community_posts"
      ADD COLUMN IF NOT EXISTS "area" varchar(100) NOT NULL DEFAULT ''
    `);
    await queryRunner.query(`
      ALTER TABLE "community_posts"
      ADD COLUMN IF NOT EXISTS "durationHours" integer NOT NULL DEFAULT 24
    `);
    await queryRunner.query(`
      ALTER TABLE "community_posts"
      ADD COLUMN IF NOT EXISTS "price" numeric(10,2) NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "community_posts"
      ADD COLUMN IF NOT EXISTS "status" varchar(16) NOT NULL DEFAULT 'pending'
    `);
    await queryRunner.query(`
      ALTER TABLE "community_posts"
      ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP
    `);
    await queryRunner.query(`
      ALTER TABLE "community_posts"
      ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP
    `);
    await queryRunner.query(`
      ALTER TABLE "community_posts"
      ADD COLUMN IF NOT EXISTS "rejectionReason" text
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_community_posts_status"
      ON "community_posts" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_community_posts_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "community_posts" DROP COLUMN IF EXISTS "rejectionReason"
    `);
    await queryRunner.query(`
      ALTER TABLE "community_posts" DROP COLUMN IF EXISTS "expiresAt"
    `);
    await queryRunner.query(`
      ALTER TABLE "community_posts" DROP COLUMN IF EXISTS "verifiedAt"
    `);
    await queryRunner.query(`
      ALTER TABLE "community_posts" DROP COLUMN IF EXISTS "status"
    `);
    await queryRunner.query(`
      ALTER TABLE "community_posts" DROP COLUMN IF EXISTS "price"
    `);
    await queryRunner.query(`
      ALTER TABLE "community_posts" DROP COLUMN IF EXISTS "durationHours"
    `);
    await queryRunner.query(`
      ALTER TABLE "community_posts" DROP COLUMN IF EXISTS "area"
    `);
  }
}
