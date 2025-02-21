import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MainParameter } from '../entities/main-parameters.entity';
import { CreateMainParameterDto } from '../dto/create-main-parameter.dto';
import { ConnectedModule } from '../entities/connected-module.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
@Injectable()
export class ConfigTreeService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectRepository(MainParameter)
    private readonly mainParameterRepository: Repository<MainParameter>,

    @InjectRepository(ConnectedModule)
    private readonly connectedModuleRepository: Repository<ConnectedModule>,
  ) { }

  /**
   * Создание основного параметра с модулями.
   * Проверяет уникальность модулей на каждом уровне, включая проверку родительских модулей.
   * @param {CreateMainParameterDto} createMainParameterDto Объект, содержащий имя основного параметра и модули.
   * @returns {Promise<MainParameter>} Возвращает основной параметр, созданный или найденный в базе данных.
   * @throws {BadRequestException} Бросает исключение, если модуль с таким именем уже существует или родитель не найден.
   */
  async create(createMainParameterDto: CreateMainParameterDto): Promise<{ mainParameter: MainParameter, addedModules: any[] }> {
    const { name, modules } = createMainParameterDto;

    let mainParameter = await this.mainParameterRepository.findOne({ where: { name } })
      ?? await this.mainParameterRepository.save({ name });

    if (!modules?.length) return { mainParameter, addedModules: [] };

    const existingModules = new Map(
      (await this.connectedModuleRepository.find({ where: { mainParameter } }))
        .map(m => [`${m.name}_${m.level}`, m.id])
    );

    const newModules = new Set<string>();
    const firstLevelNames = new Set<string>();

    for (const { name, type, level, parentName } of modules) {
      if (level === 1 && !firstLevelNames.add(name)) {
        throw new BadRequestException(`Модуль с именем "${name}" уже существует на уровне ${level}.`);
      }

      const moduleKey = `${name}_${level}`;
      if (existingModules.has(moduleKey) || !newModules.add(moduleKey)) {
        throw new BadRequestException(`Модуль с именем "${name}" уже существует на уровне ${level}.`);
      }

      if (level > 1 && !existingModules.has(`${parentName}_${level - 1}`)) {
        throw new BadRequestException(`Родительский модуль "${parentName}" для "${name}" на уровне ${level} не найден.`);
      }
    }

    const savedModules = await this.connectedModuleRepository.save(
      modules.map(({ name, type, level, parentName }) =>
        this.connectedModuleRepository.create({
          name, type, level, mainParameter,
          parent: level > 1 ? { id: existingModules.get(`${parentName}_${level - 1}`) } : null
        })
      )
    );

    return {
      mainParameter,
      addedModules: savedModules.map(m => ({
        id: m.id,
        name: m.name,
        level: m.level,
        parentId: m.parent?.id || null
      }))
    };
  }


  /**
  * Генерирует новый набор объявлений на основе параметров, переданных в запросе.
  * Процесс включает нахождение основного параметра, выбор корневого модуля, генерацию дерева модулей и случайный выбор модулей.
  * 
  * @param {Record<string, string>} query Объект с параметрами запроса, где ключи — это имена параметров, а значения — соответствующие модули.
  * @returns {Promise<any>} Возвращает объект с adset_id и выбранными модулями.
  * @throws {BadRequestException} Выбрасывает исключение, если не найдены совпадающие параметры.
  */

  async generateAdSet(query: Record<string, string>): Promise<any> {
    const cacheKey = `adset:${JSON.stringify(query)}`;
    const cachedData = await this.cacheManager.get(cacheKey);

    if (cachedData) {
      console.log(`Cache hit for key: ${cacheKey}`);
      return cachedData;
    }

    const mainParameters = await this.mainParameterRepository.find({
      where: { name: In(Object.keys(query)) },
    });

    if (!mainParameters.length) throw new BadRequestException('No matching parameters found');

    const modules = await Promise.all(mainParameters.map(async (mainParameter) => {
      const rootModule = await this.connectedModuleRepository.findOne({
        where: { mainParameter, name: In(Object.values(query)), parent: null },
        order: { level: 'ASC' },
      });

      if (!rootModule) {
        console.log(`No root module found for ${mainParameter.name}`);
        return null;
      }

      const tree = await this.getModuleTree(mainParameter, rootModule.id);
      return this.selectModules(tree).map(module => ({ [module.name]: module.type }));
    }));

    const result = {
      adset_id: Math.floor(Math.random() * 100000),
      modules: modules.filter(Boolean),
    };

    await this.cacheManager.set(cacheKey, result, 300000); // Кешируем на 5 минут (TTL = 300000 мс)
    return result;
  }

  /**
   * Рекурсивно строит дерево модулей, начиная с корневого модуля.
   * 
   * @param {MainParameter} mainParameter Основной параметр, к которому привязаны модули.
   * @param {number | null} parentId ID родительского модуля, от которого строится дерево.
   * @returns {Promise<any[]>} Возвращает массив, представляющий дерево модулей.
   */
  private async getModuleTree(mainParameter: MainParameter, parentId: number | null): Promise<any[]> {
    const modules = await this.connectedModuleRepository.find({
      where: { mainParameter, parent: { id: parentId } },
      order: { name: 'ASC' },
    });

    if (!modules.length) return [];

    const selectedModule = modules.length === 1 ? modules[0] : modules[Math.floor(Math.random() * modules.length)];
    console.log(`Selected module for parentId ${parentId}:`, selectedModule);

    return [{
      name: selectedModule.name,
      type: selectedModule.type,
      probability: 1,
      children: await this.getModuleTree(mainParameter, selectedModule.id),
    }];
  }

  /**
   * Выбирает модули из дерева модулей.
   * 
   * @param {any[]} tree Дерево модулей.
   * @returns {any[]} Возвращает выбранные модули в виде плоского списка.
   */
  private selectModules(tree: any[]): any[] {
    const selectedModules: any[] = [];

    for (const node of tree) {
      selectedModules.push({ name: node.name, type: node.type });

      if (node.children && node.children.length) {
        selectedModules.push(...this.selectModules(node.children));
      }
    }

    return selectedModules;
  }

  /**
   * Возвращает все наборы объявлений, включая все модули для каждого основного параметра.
   * Для каждого основного параметра генерирует иерархию модулей и выбирает модули для набора.
   * 
   * @returns {Promise<any>} Возвращает объект с ID набора объявлений и модулями для каждого основного параметра.
   * @throws {BadRequestException} Выбрасывает исключение, если не найдены основные параметры.
   */

  async getAllAdSets(): Promise<any> {
    const mainParameters = await this.mainParameterRepository.find();
    const adsetId = Math.floor(Math.random() * 100000)
    if (!mainParameters.length) {
      return {
        adset_id: adsetId
      }
    }

    const modules: Record<string, Record<string, any[]>> = {};

    await Promise.all(
      mainParameters.map(async (mainParameter) => {
        const rootModules = await this.connectedModuleRepository.find({
          where: { mainParameter, parent: null },
          order: { level: 'ASC' },
        });

        if (!rootModules.length) {
          console.log(`No root modules found for ${mainParameter.name}`);
          return;
        }

        modules[mainParameter.name] = Object.fromEntries(
          await Promise.all(
            rootModules.map(async (rootModule) => {
              const moduleHierarchy = await this.getModuleHierarchyRecursive(rootModule.id);
              return [rootModule.name, moduleHierarchy];
            })
          )
        );
      })
    );

    return {
      adset_id: adsetId,
      modules,
    };
  }

  /**
   * Рекурсивно получает иерархию модулей, начиная с указанного moduleId.
   *
   * @param {number} moduleId - ID родительского модуля, с которого начинается построение иерархии.
   * @returns {Promise<any[]>} - Массив объектов, представляющих иерархию модулей, 
   * где каждый модуль содержит свое имя, тип и вложенные модули (children).
   */
  async getModuleHierarchyRecursive(moduleId: number): Promise<any[]> {
    const children = await this.connectedModuleRepository.find({
      where: { parent: { id: moduleId } },
      order: { level: 'ASC' },
    });

    return Promise.all(
      children.map(async (child) => ({
        [child.name]: child.type,
        children: await this.getModuleHierarchyRecursive(child.id)
      }))
    );
  }
}
