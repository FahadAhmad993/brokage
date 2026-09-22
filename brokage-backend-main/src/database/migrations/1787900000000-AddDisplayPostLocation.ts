import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds optional city/area fields to Display posts, same as the Community feed's ads. */
export class AddDisplayPostLocation1787900000000 implements MigrationInterface {
  name = 'AddDisplayPostLocation1787900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "display_posts"
      ADD COLUMN IF NOT EXISTS "city" text,
      ADD COLUMN IF NOT EXISTS "area" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "display_posts"
      DROP COLUMN IF EXISTS "city",
      DROP COLUMN IF EXISTS "area"
    `);
  }
}
