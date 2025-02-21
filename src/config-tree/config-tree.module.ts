import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MainParameter } from './entities/main-parameters.entity';
import { ConnectedModule } from "./entities/connected-module.entity";
import { ConfigTreeService } from './services/config-tree.service';
import { ConfigTreeController } from './controllers/config-tree.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MainParameter, ConnectedModule]),
  ],
  controllers: [ConfigTreeController],
  providers: [ConfigTreeService],
  exports: [],
})
export class configTreeModule { }
