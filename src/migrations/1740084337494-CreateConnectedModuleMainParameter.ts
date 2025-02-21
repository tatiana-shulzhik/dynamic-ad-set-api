import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateConnectedModuleMainParameter1740084337494 implements MigrationInterface {
    name = 'CreateConnectedModuleMainParameter1740084337494'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "connected_modules" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "type" character varying(255) NOT NULL, "level" integer NOT NULL, "main_parameter_id" integer, "parent_id" integer, CONSTRAINT "PK_3b7ddc415284a9a22a75d6546d2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "main_parameters" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, CONSTRAINT "PK_169245ec041bcc297639a3d8b39" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "connected_modules" ADD CONSTRAINT "FK_68ef120b8c4e88f0faa086607ec" FOREIGN KEY ("main_parameter_id") REFERENCES "main_parameters"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "connected_modules" ADD CONSTRAINT "FK_759bd5edd605c1ac0e779ae24f8" FOREIGN KEY ("parent_id") REFERENCES "connected_modules"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "connected_modules" DROP CONSTRAINT "FK_759bd5edd605c1ac0e779ae24f8"`);
        await queryRunner.query(`ALTER TABLE "connected_modules" DROP CONSTRAINT "FK_68ef120b8c4e88f0faa086607ec"`);
        await queryRunner.query(`DROP TABLE "main_parameters"`);
        await queryRunner.query(`DROP TABLE "connected_modules"`);
    }

}
