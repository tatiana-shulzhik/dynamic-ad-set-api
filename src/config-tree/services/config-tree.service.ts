import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MainParameter } from '../entities/main-parameters.entity';
import { CreateMainParameterDto } from '../dto/create-main-parameter.dto';
import { ConnectedModule } from '../entities/connected-module.entity';

@Injectable()
export class ConfigTreeService {
  constructor(
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
  async create(createMainParameterDto: CreateMainParameterDto): Promise<MainParameter> {
    const { name, modules } = createMainParameterDto;

    let mainParameter = await this.mainParameterRepository.findOne({ where: { name } })
      ?? await this.mainParameterRepository.save({ name });

    if (!modules?.length) return mainParameter;

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

    await this.connectedModuleRepository.save(
      modules.map(({ name, type, level, parentName }) =>
        this.connectedModuleRepository.create({
          name, type, level, mainParameter,
          parent: level > 1 ? { id: existingModules.get(`${parentName}_${level - 1}`) } : null
        })
      )
    );

    return mainParameter;
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
    const mainParameters = await this.mainParameterRepository.find({
      where: { name: In(Object.keys(query)) },
    });

    if (!mainParameters.length) throw new BadRequestException('No matching parameters found');

    const modules = await Promise.all(mainParameters.map(async (mainParameter) => {
      const rootModule = await this.connectedModuleRepository.findOne({
        where: { mainParameter, name: In(Object.values(query)), parent: null },
        order: { level: 'DESC' },
      });

      if (!rootModule) {
        console.log(`No root module found for ${mainParameter.name}`);
        return null;
      }

      const tree = await this.getModuleTree(mainParameter, rootModule.id);
      return this.selectModules(tree).map(module => ({ [module.name]: module.type }));
    }));

    return {
      adset_id: Math.floor(Math.random() * 100000),
      modules: modules.filter(Boolean),
    };
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
    if (!mainParameters.length) throw new BadRequestException('No parameters found');

    const mainParameterIds = mainParameters.map(mp => mp.id);
    const allModules = await this.connectedModuleRepository.find({
      where: { mainParameter: In(mainParameterIds) },
      order: { level: 'DESC', name: 'ASC' },
      relations: ['mainParameter', 'parent']
    });

    const modulesByMainParameter = new Map(mainParameters.map(mp => [mp.id, {}]));

    allModules.forEach(module => {
      if (!module.parent && module.mainParameter) {
        const moduleHierarchy = this.buildModuleHierarchy(module, allModules);
        modulesByMainParameter.get(module.mainParameter.id)[module.name] = this.selectModules(moduleHierarchy);
      } else if (!module.mainParameter) {
        console.warn(`Module ${module.name} is missing mainParameter`);
      }
    });

    return {
      adset_id: Math.floor(Math.random() * 100000),
      modules: Object.fromEntries(mainParameters.map(mp => [mp.name, modulesByMainParameter.get(mp.id)])),
    };
  }

  private buildModuleHierarchy(rootModule: any, allModules: any[]): any[] {
    return [{
      name: rootModule.name,
      type: rootModule.type,
      children: allModules
        .filter(m => m.parent?.id === rootModule.id)
        .map(child => this.buildModuleHierarchy(child, allModules))
    }];
  }


  /**
   * Рекурсивно строит иерархию модулей для основного параметра.
   * 
   * @param {MainParameter} mainParameter Основной параметр, к которому привязаны модули.
   * @param {number | null} parentId ID родительского модуля, от которого строится иерархия.
   * @returns {Promise<any[]>} Возвращает массив, представляющий иерархию модулей.
   */
  private async getModuleHierarchy(
    mainParameter: MainParameter,
    parentId: number | null
  ): Promise<any[]> {
    const modules = await this.connectedModuleRepository.find({
      where: parentId ? { mainParameter, parent: { id: parentId } } : { mainParameter, parent: null },
      order: { name: 'ASC' },
      relations: ['children'],
    });

    if (!modules.length) return [];

    return Promise.all(
      modules.map(async (module) => ({
        name: module.name,
        type: module.type,
        children: await this.getModuleHierarchy(mainParameter, module.id),
      }))
    );
  }
}
