import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexesToConnectedModules1740103007038 implements MigrationInterface {
    name = 'AddIndexesToConnectedModules1740103007038'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "idx_parent_id" ON "connected_modules" ("parent_id") `);
        await queryRunner.query(`CREATE INDEX "idx_main_parameter_id" ON "connected_modules" ("main_parameter_id") `);
        await queryRunner.query(`CREATE INDEX "idx_name" ON "main_parameters" ("name") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_name"`);
        await queryRunner.query(`DROP INDEX "public"."idx_main_parameter_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_parent_id"`);
    }

}
