import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ConfigTreeService } from '../services/config-tree.service';
import { CreateMainParameterDto } from '../dto/create-main-parameter.dto';
import { MainParameter } from '../entities/main-parameters.entity';

@Controller('config')
export class ConfigTreeController {
  constructor(private readonly configTreeService: ConfigTreeService) { }

  @Post('create')
  async create(@Body() createMainParameterDto: CreateMainParameterDto): Promise<MainParameter> {
    return this.configTreeService.create(createMainParameterDto);
  }

  @Get()
  async getAdSet(@Query() query: Record<string, string>): Promise<any> {
    return this.configTreeService.generateAdSet(query);
  }

  @Get('all')
  async getAllAdSets(): Promise<any> {
    return this.configTreeService.getAllAdSets();
  }
}
