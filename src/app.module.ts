import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configTreeModule } from './config-tree/config-tree.module';
import { typeOrmConfig } from './data-source';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    configTreeModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
