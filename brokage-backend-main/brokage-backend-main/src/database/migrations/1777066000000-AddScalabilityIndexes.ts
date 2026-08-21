import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds indexes that we discovered to be hot-path during a scalability audit:
 *
 *   - chat_threads.updatedAt — every inbox fetch orders by this column.
 *   - properties.priceMonthly — listings are filtered/ordered by price.
 *   - properties.createdAt    — default "newest first" sort on the listings feed.
 *
 * All are additive `CREATE INDEX IF NOT EXISTS` so re-running the migration
 * is a no-op and rollback is safe.
 */
export class AddScalabilityIndexes1777066000000 implements MigrationInterface {
  name = 'AddScalabilityIndexes1777066000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_threads_updatedAt"
      ON "chat_threads" ("updatedAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_properties_priceMonthly"
      ON "properties" ("priceMonthly")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_properties_createdAt"
      ON "properties" ("createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_properties_createdAt"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_properties_priceMonthly"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_chat_threads_updatedAt"`,
    );
  }
}
