import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Admin-panel support: role flag + moderation flags on `users`.
 *  - `isAdmin`    — grants access to `/admin/*` endpoints.
 *  - `isBlocked`  — admin-set; blocks login and invalidates existing tokens.
 *  - `isDisabled` — admin-set; same enforcement as `isBlocked`, kept as a
 *                   separate flag so the admin UI can distinguish "blocked
 *                   for abuse" from "disabled pending review".
 */
export class AddUserAdminAndModerationFlags1787300000000
  implements MigrationInterface
{
  name = 'AddUserAdminAndModerationFlags1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "isAdmin" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "isBlocked" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "isDisabled" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "isDisabled"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "isBlocked"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "isAdmin"
    `);
  }
}
