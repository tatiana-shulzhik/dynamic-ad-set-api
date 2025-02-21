import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ConfigTreeService } from '../services/config-tree.service';
import { CreateMainParameterDto } from '../dto/create-main-parameter.dto';
import { MainParameter } from '../entities/main-parameters.entity';

/**
 * Контроллер для работы с деревом конфигураций.
 * Он предоставляет методы для создания дерева конфигурации, получения дерева конфигурации по условиям и получения всего дерева конфигураций.
 */
@Controller('config')
export class ConfigTreeController {
  constructor(private readonly configTreeService: ConfigTreeService) { }
  /**
   * Создание нового параметра конфигурации/его модулей .
   * 
   * Этот метод принимает данные о параметре и создает параметры конфигурации/его модули.
   * 
   * @param {CreateMainParameterDto} createMainParameterDto - Данные для создания нового основного параметра.
   * @returns {Promise<MainParameter>} - Возвращает созданный основной параметр.
   */
  @Post('create')
  async create(@Body() createMainParameterDto: CreateMainParameterDto): Promise<MainParameter> {
    return this.configTreeService.create(createMainParameterDto);
  }

  /**
   * Получение конфигурации на основе условий.
   * 
   * Этот метод возвращает динамическую сборку конфигураций по параметрам, переданным в query-строке.
   * 
   * @param {Record<string, string>} query - Условия для выборки конфигурации (например, geo).
   * @returns {Promise<any>} - Возвращает объект с динамической конфигурацией на основе переданных условий.
   */
  @Get()
  async getAdSet(@Query() query: Record<string, string>): Promise<any> {
    return this.configTreeService.generateAdSet(query);
  }

  /**
   * Получение всего дерева конфигураций.
   * 
   * Этот метод возвращает все доступные конфигурации.
   * 
   * @returns {Promise<any>} - Возвращает список всех конфигураций.
   */
  @Get('all')
  async getAllAdSets(): Promise<any> {
    return this.configTreeService.getAllAdSets();
  }
}
