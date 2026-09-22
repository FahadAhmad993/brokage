import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the "Display" feature: a broker's personal portfolio/storefront
 * page (Profile → Display), separate from `properties` (My Listings) and
 * `community_posts` (the Community feed's ads).
 *
 *   - `display_profiles`: one row per user, holding just their Display
 *     cover photo (created lazily on first use).
 *   - `display_posts`: the individual multi-photo posts on that page —
 *     modelled on `community_posts` (paid duration, admin verification)
 *     but with a required `marlaSize` and a flexible `extraFields` bag for
 *     everything else (bedrooms, bathrooms, kitchen, carporch, tv lounge,
 *     ...), plus a `sold` status the Community feed doesn't have.
 *   - `app_settings.displayPricePerHourPkr`: Display is priced separately
 *     from the Community feed's `pricePerHourPkr`.
 */
export class AddDisplayFeature1787800000000 implements MigrationInterface {
  name = 'AddDisplayFeature1787800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "display_profiles" (
        "userId" uuid PRIMARY KEY,
        "coverImageUrl" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_display_profiles_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "display_posts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "images" jsonb NOT NULL,
        "marlaSize" numeric(10,2) NOT NULL,
        "description" text,
        "extraFields" jsonb NOT NULL DEFAULT '{}',
        "durationHours" integer NOT NULL DEFAULT 24,
        "price" numeric(10,2) NOT NULL DEFAULT 0,
        "status" varchar(16) NOT NULL DEFAULT 'pending',
        "verifiedAt" TIMESTAMP,
        "expiresAt" TIMESTAMP,
        "soldAt" TIMESTAMP,
        "rejectionReason" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_display_posts_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_display_posts_userId" ON "display_posts" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_display_posts_status_expiresAt"
        ON "display_posts" ("status", "expiresAt")
    `);

    await queryRunner.query(`
      ALTER TABLE "app_settings"
      ADD COLUMN IF NOT EXISTS "displayPricePerHourPkr" numeric(10,4) NOT NULL DEFAULT 2.0833
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "app_settings" DROP COLUMN IF EXISTS "displayPricePerHourPkr"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "display_posts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "display_profiles"`);
  }
}
