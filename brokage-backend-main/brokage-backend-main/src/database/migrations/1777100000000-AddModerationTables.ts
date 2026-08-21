import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModerationTables1777100000000 implements MigrationInterface {
  name = 'AddModerationTables1777100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // user_blocks
    await queryRunner.query(
      `CREATE TABLE "user_blocks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "blockerId" uuid NOT NULL, "blockedId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_user_blocks_blocker_blocked" UNIQUE ("blockerId", "blockedId"), CONSTRAINT "PK_user_blocks_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_blocks_blockerId" ON "user_blocks" ("blockerId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_blocks_blockedId" ON "user_blocks" ("blockedId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_blocks" ADD CONSTRAINT "FK_user_blocks_blocker" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_blocks" ADD CONSTRAINT "FK_user_blocks_blocked" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // content_reports
    await queryRunner.query(
      `CREATE TABLE "content_reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reporterId" uuid NOT NULL, "targetType" character varying(16) NOT NULL, "targetId" character varying NOT NULL, "reason" character varying(64) NOT NULL, "details" text, "status" character varying(16) NOT NULL DEFAULT 'open', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_content_reports_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_content_reports_reporterId" ON "content_reports" ("reporterId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_content_reports_targetId" ON "content_reports" ("targetId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_content_reports_status" ON "content_reports" ("status")`,
    );
    await queryRunner.query(
      `ALTER TABLE "content_reports" ADD CONSTRAINT "FK_content_reports_reporter" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "content_reports" DROP CONSTRAINT "FK_content_reports_reporter"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_content_reports_status"`);
    await queryRunner.query(`DROP INDEX "IDX_content_reports_targetId"`);
    await queryRunner.query(`DROP INDEX "IDX_content_reports_reporterId"`);
    await queryRunner.query(`DROP TABLE "content_reports"`);

    await queryRunner.query(
      `ALTER TABLE "user_blocks" DROP CONSTRAINT "FK_user_blocks_blocked"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_blocks" DROP CONSTRAINT "FK_user_blocks_blocker"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_user_blocks_blockedId"`);
    await queryRunner.query(`DROP INDEX "IDX_user_blocks_blockerId"`);
    await queryRunner.query(`DROP TABLE "user_blocks"`);
  }
}
