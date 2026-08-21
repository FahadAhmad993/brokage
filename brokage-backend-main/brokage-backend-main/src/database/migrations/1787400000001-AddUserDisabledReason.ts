import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `disabledReason` — free-text note an admin attaches when blocking/
 * disabling a user (typically while actioning a report). Shown to the user
 * on the forced-logout screen the next time the app tries to use their
 * (now-rejected) token.
 */
export class AddUserDisabledReason1787400000001 implements MigrationInterface {
  name = 'AddUserDisabledReason1787400000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "disabledReason" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "disabledReason"
    `);
  }
}
