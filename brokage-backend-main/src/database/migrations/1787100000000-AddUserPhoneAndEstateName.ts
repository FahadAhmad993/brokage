import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPhoneAndEstateName1787100000000
  implements MigrationInterface
{
  name = 'AddUserPhoneAndEstateName1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD "phone" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD "estateName" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "estateName"
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "phone"
    `);
  }
}
