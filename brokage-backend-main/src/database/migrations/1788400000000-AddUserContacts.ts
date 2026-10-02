import { MigrationInterface, QueryRunner } from 'typeorm';

/** Personal contact list: save another user by their account email. */
export class AddUserContacts1788400000000 implements MigrationInterface {
  name = 'AddUserContacts1788400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_contacts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ownerId" uuid NOT NULL,
        "contactUserId" uuid NOT NULL,
        "name" character varying(100),
        "phone" character varying(32),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_contacts_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_contacts_owner_contact" UNIQUE ("ownerId", "contactUserId"),
        CONSTRAINT "FK_user_contacts_owner" FOREIGN KEY ("ownerId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_contacts_contact" FOREIGN KEY ("contactUserId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_contacts_owner" ON "user_contacts" ("ownerId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_contacts_contact" ON "user_contacts" ("contactUserId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_contacts"`);
  }
}
