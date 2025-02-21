import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MainParameter } from './entities/main-parameters.entity';
import { ConnectedModule } from "./entities/connected-module.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([MainParameter, ConnectedModule]),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class configTreeModule { }
