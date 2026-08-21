import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommunityPostContextToChatMessage1786817345658
  implements MigrationInterface
{
  name = 'AddCommunityPostContextToChatMessage1786817345658';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      ADD COLUMN "communityPostContext" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      DROP COLUMN "communityPostContext"
    `);
  }
}