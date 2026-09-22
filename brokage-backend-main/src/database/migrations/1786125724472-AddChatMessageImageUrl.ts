import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChatMessageImageUrl1786125724472 implements MigrationInterface {
  name = 'AddChatMessageImageUrl1786125724472';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      ADD "imageUrl" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      DROP COLUMN "imageUrl"
    `);
  }
}
