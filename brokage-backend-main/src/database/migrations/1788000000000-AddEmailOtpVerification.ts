import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds email OTP verification for signup and login.
 *
 * `isEmailVerified` defaults to `true` at the database level so every
 * account that existed before this migration keeps logging in exactly as
 * before — only NEW registrations (which explicitly pass `false` in
 * application code) go through the verify-before-login flow.
 */
export class AddEmailOtpVerification1788000000000 implements MigrationInterface {
  name = 'AddEmailOtpVerification1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "isEmailVerified" boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "otp_codes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" text NOT NULL,
        "codeHash" text NOT NULL,
        "purpose" varchar(16) NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "attempts" integer NOT NULL DEFAULT 0,
        "consumedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_otp_codes_email" ON "otp_codes" ("email")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "otp_codes"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "isEmailVerified"`,
    );
  }
}
