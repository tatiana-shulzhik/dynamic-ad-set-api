import { IsString, IsArray, IsOptional } from 'class-validator';

export class CreateMainParameterDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  modules?: { name: string; type: string; level: number; parentName: string }[];
}
