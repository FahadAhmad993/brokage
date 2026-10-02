import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Display-post visitor counter: a `display_post_views` table (one row per
 * distinct visitor per post, enforced by a unique index) plus a denormalised
 * `viewCount` on `display_posts` so listing endpoints don't need a COUNT().
 */
export class AddDisplayPostViews1788200000000 implements MigrationInterface {
  name = 'AddDisplayPostViews1788200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "display_posts"
      ADD COLUMN IF NOT EXISTS "viewCount" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "display_post_views" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "postId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_display_post_views_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_display_post_views_post" FOREIGN KEY ("postId")
          REFERENCES "display_posts"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_display_post_views_post_user"
      ON "display_post_views" ("postId", "userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_display_post_views_post_user"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "display_post_views"`);
    await queryRunner.query(
      `ALTER TABLE "display_posts" DROP COLUMN IF EXISTS "viewCount"`,
    );
  }
}
