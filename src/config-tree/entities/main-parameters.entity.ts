import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ConnectedModule } from './connected-module.entity';

@Entity('main_parameters')
export class MainParameter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @OneToMany(() => ConnectedModule, (module) => module.mainParameter)
  modules: ConnectedModule[];
}
