import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * NOTE: originally this class was named `FixCommunityPostUserId1787100000000`
 * — a copy/paste typo where a *different* migration's timestamp (100000000
 * later than this file's own name) was appended, which made TypeORM refuse
 * to run ANY migration in the project ("migration name is wrong"). Renamed
 * to be self-consistent with the file's own timestamp (1786390048210).
 *
 * Also wrapped in a guard so it's a no-op when `community_posts` doesn't
 * exist yet, or when `userId` is already `uuid` (e.g. created fresh via
 * `synchronize: true` in an earlier dev session, or already migrated).
 */
export class FixCommunityPostUserId1786390048210 implements MigrationInterface {
  name = 'FixCommunityPostUserId1786390048210';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'community_posts'
        ) AND EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'community_posts'
            AND column_name = 'userId'
            AND data_type <> 'uuid'
        ) THEN
          ALTER TABLE "community_posts"
          ALTER COLUMN "userId" TYPE uuid
          USING "userId"::uuid;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'community_posts'
        ) THEN
          ALTER TABLE "community_posts"
          ALTER COLUMN "userId" TYPE character varying
          USING "userId"::character varying;
        END IF;
      END $$;
    `);
  }
}
