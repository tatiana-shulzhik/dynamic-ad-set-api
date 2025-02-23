import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { MainParameter } from './main-parameters.entity';

@Entity('connected_modules')
@Index('idx_main_parameter_id', ['mainParameter'])
@Index('idx_parent_id', ['parent'])
export class ConnectedModule {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => MainParameter, (mainParam) => mainParam.modules)
  @JoinColumn({ name: 'main_parameter_id' })
  mainParameter: MainParameter;

  @ManyToOne(() => ConnectedModule, (module) => module.children)
  @JoinColumn({ name: 'parent_id' })
  parent: ConnectedModule;

  @OneToMany(() => ConnectedModule, (module) => module.parent)
  children: ConnectedModule[];

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  type: string;

  @Column({ type: 'int' })
  level: number;
}
