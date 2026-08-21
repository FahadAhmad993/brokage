import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * NOTE: this file's class body originally contained the WRONG migration
 * entirely — a duplicate of `FixCommunityPostUserId` (with an added FK)
 * mistakenly saved under the `AddCommunityPosts` filename, with a class
 * name that didn't even match its own file, which made TypeORM refuse
 * to run ANY migration in the project ("migration name is wrong"). The
 * actual "create community_posts table" migration was missing from this
 * project entirely — the table only ever existed because an earlier dev
 * session used `synchronize: true`.
 *
 * Rebuilt here as the real, idempotent table-creation migration (matches
 * `CommunityPostEntity`) plus the FK constraint, both `IF NOT EXISTS`-safe
 * so it's harmless whether or not the table/constraint already exists.
 */
export class AddCommunityPosts1787000000000 implements MigrationInterface {
  name = 'AddCommunityPosts1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "community_posts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "title" character varying(100) NOT NULL,
        "description" text NOT NULL,
        "city" character varying(100) NOT NULL,
        "images" jsonb NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_community_posts_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_community_posts_user'
        ) THEN
          ALTER TABLE "community_posts"
          ADD CONSTRAINT "FK_community_posts_user"
          FOREIGN KEY ("userId")
          REFERENCES "users"("id")
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "community_posts"
      DROP CONSTRAINT IF EXISTS "FK_community_posts_user"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "community_posts"
    `);
  }
}
