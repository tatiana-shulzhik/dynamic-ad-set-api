import { IsString, IsOptional, IsArray } from 'class-validator';

/**
 * DTO для создания основного параметра.
 * Этот класс используется для передачи данных при создании основного параметра.
 */
export class CreateMainParameterDto {

  /**
   * Название основного параметра.
   * Это обязательное строковое поле.
   * 
   * @example "geo"
   */
  @IsString()
  name: string;

  /**
   * Список модулей, которые будут связаны с основным параметром.
   * Этот параметр является необязательным.
   * Каждый модуль имеет имя, тип, уровень и имя родителя.
   * 
   * @example [
   *   { name: "push", type: "type1", level: 1 },
   *   { name: "monetization", type: "type2", level: 2, parentName: "123" }
   * ]
   */
  @IsOptional()
  @IsArray()
  modules?: { name: string; type: string; level: number; parentName: string }[];
}
