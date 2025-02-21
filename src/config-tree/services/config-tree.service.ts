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

  async create(createMainParameterDto: CreateMainParameterDto): Promise<MainParameter> {
    const { name, modules } = createMainParameterDto;

    let mainParameter = await this.mainParameterRepository.findOne({ where: { name } })
      ?? await this.mainParameterRepository.save(this.mainParameterRepository.create({ name }));

    if (!modules?.length) return mainParameter;

    const existingModulesMap = new Map(
      (await this.connectedModuleRepository.find({ where: { mainParameter } }))
        .map(m => [`${m.name}_${m.level}`, m.id])
    );

    const newModulesSet = new Set<string>();
    const firstLevelNames = new Set<string>();

    for (const { name, type, level, parentName } of modules) {
      if (level === 1) {
        if (firstLevelNames.has(name)) {
          throw new BadRequestException(`Модуль с именем "${name}" уже существует на уровне ${level}.`);
        }
        firstLevelNames.add(name);
      }

      const moduleKey = `${name}_${level}`;
      if (existingModulesMap.has(moduleKey) || newModulesSet.has(moduleKey)) {
        throw new BadRequestException(`Модуль с именем "${name}" уже существует на уровне ${level}.`);
      }
      newModulesSet.add(moduleKey);

      if (level > 1) {
        const parentModuleKey = `${parentName}_${level - 1}`;
        const parentModuleId = existingModulesMap.get(parentModuleKey);
        if (!parentModuleId) {
          throw new BadRequestException(`Родительский модуль "${parentName}" для "${name}" на уровне ${level} не найден.`);
        }

        const parentModulesAtLevel = await this.connectedModuleRepository.find({
          where: { parent: { id: parentModuleId }, level },
        });

        const parentNamesAtLevel = parentModulesAtLevel.map(m => m.name);
        if (parentNamesAtLevel.includes(name)) {
          throw new BadRequestException(`Модуль с именем "${name}" уже существует на уровне ${level} у родителя "${parentName}".`);
        }
      }
    }

    await this.connectedModuleRepository.save(
      modules.map(({ name, type, level, parentName }) =>
        this.connectedModuleRepository.create({
          name, type, level, mainParameter,
          parent: level > 1 ? { id: existingModulesMap.get(`${parentName}_${level - 1}`) } : null
        })
      )
    );

    return mainParameter;
  }

  async generateAdSet(query: Record<string, string>): Promise<any> {
    const mainParameters = await this.mainParameterRepository.find({
      where: { name: In(Object.keys(query)) },
    });

    if (!mainParameters.length) throw new BadRequestException('No matching parameters found');

    const modules: any[] = [];

    for (const mainParameter of mainParameters) {
      console.log(`Processing mainParameter: ${mainParameter.name}`);

      const rootModule = await this.connectedModuleRepository.findOne({
        where: { mainParameter, name: In(Object.values(query)), parent: null },
        order: { level: 'DESC' },
      });

      if (!rootModule) {
        console.log(`No root module found for ${mainParameter.name}`);
        continue;
      }

      const tree = await this.getModuleTree(mainParameter, rootModule.id);

      console.log(`Generated tree for ${mainParameter.name}:`, JSON.stringify(tree, null, 2));

      const selectedModules = this.selectModules(tree);

      const moduleGroup: any[] = [];

      for (const module of selectedModules) {
        moduleGroup.push({ [module.name]: module.type });
      }

      modules.push(moduleGroup);
    }

    return {
      adset_id: Math.floor(Math.random() * 100000),
      modules,
    };
  }

  private async getModuleTree(mainParameter: MainParameter, parentId: number | null): Promise<any[]> {
    const modules = await this.connectedModuleRepository.find({
      where: { mainParameter, parent: { id: parentId } },
      order: { name: 'ASC' },
    });

    if (!modules.length) return [];

    const selectedModule = modules.length === 1
      ? modules[0]
      : modules[Math.floor(Math.random() * modules.length)];

    console.log(`Selected module for parentId ${parentId}:`, selectedModule);

    const selectedModuleTree = await this.getModuleTree(mainParameter, selectedModule.id);

    return [{
      name: selectedModule.name,
      type: selectedModule.type,
      probability: 1,
      children: selectedModuleTree,
    }];
  }

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

  async getAllAdSets(): Promise<any> {
    const mainParameters = await this.mainParameterRepository.find();
    if (!mainParameters.length) {
      throw new BadRequestException('No parameters found');
    }

    let modules: Record<string, Record<string, any>> = {};

    for (const mainParameter of mainParameters) {
      console.log(`Processing mainParameter: ${mainParameter.name}`);

      const rootModules = await this.connectedModuleRepository.find({
        where: { mainParameter, parent: null },
        order: { level: 'DESC' },
      });

      if (!rootModules.length) {
        console.log(`No root modules found for ${mainParameter.name}`);
        continue;
      }

      modules[mainParameter.name] = {};

      for (const rootModule of rootModules) {
        const moduleHierarchy = await this.getModuleHierarchy(mainParameter, rootModule.id);

        console.log(`Generated module hierarchy for ${mainParameter.name}:`, JSON.stringify(moduleHierarchy, null, 2));

        modules[mainParameter.name][rootModule.name] = this.selectModules(moduleHierarchy);

        console.log(`Selected modules for ${mainParameter.name} - ${rootModule.name}:`, modules[mainParameter.name][rootModule.name]);
      }
    }

    return {
      adset_id: Math.floor(Math.random() * 100000),
      modules,
    };
  }

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
