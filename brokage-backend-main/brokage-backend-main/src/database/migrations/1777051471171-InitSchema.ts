import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1777051471171 implements MigrationInterface {
  name = 'InitSchema1777051471171';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_b2ac4c23281c85c64f16ff0548" ON "chat_messages" ("threadId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fe2f91e973181fcab44f640581" ON "chat_messages" ("authorId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d15f71a9ecd07f8d8c035a1dcb" ON "chat_participants" ("threadId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fb6add83b1a7acc94433d38569" ON "chat_participants" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_participants" ADD CONSTRAINT "UQ_chat_participants_thread_user" UNIQUE ("threadId", "userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat_participants" DROP CONSTRAINT "UQ_chat_participants_thread_user"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fb6add83b1a7acc94433d38569"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d15f71a9ecd07f8d8c035a1dcb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fe2f91e973181fcab44f640581"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b2ac4c23281c85c64f16ff0548"`,
    );
  }
}
