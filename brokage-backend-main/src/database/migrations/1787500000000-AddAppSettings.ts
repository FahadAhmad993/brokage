import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `app_settings` — a single-row (key='default') configuration table the
 * admin panel edits directly: how much a community ad costs per hour, how
 * many photos an ad needs, and any extra custom fields admins want on the
 * ad-post form beyond the built-in title/description/city/area.
 */
export class AddAppSettings1787500000000 implements MigrationInterface {
  name = 'AddAppSettings1787500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" varchar(32) NOT NULL UNIQUE DEFAULT 'default',
        "pricePerHourPkr" numeric(10,2) NOT NULL DEFAULT 2.0833,
        "minImages" int NOT NULL DEFAULT 2,
        "maxImages" int NOT NULL DEFAULT 6,
        "customFields" jsonb NOT NULL DEFAULT '[]',
        "cityRequired" boolean NOT NULL DEFAULT true,
        "areaRequired" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Seed the single settings row. pricePerHourPkr defaults to the old
    // flat rate (PKR 50 / 24h block = ~2.0833/hour) so nothing changes for
    // existing installs until an admin edits it.
    await queryRunner.query(`
      INSERT INTO "app_settings" ("key")
      VALUES ('default')
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "app_settings"`);
  }
}
