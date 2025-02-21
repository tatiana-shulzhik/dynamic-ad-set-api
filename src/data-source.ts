import { DataSource } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

ConfigModule.forRoot();

const configService = new ConfigService();

const postgresConfig = {
    type: 'postgres' as const,
    host: configService.get('POSTGRES_HOST'),
    port: configService.get<number>('POSTGRES_PORT'),
    username: configService.get('POSTGRES_USER'),
    password: configService.get('POSTGRES_PASSWORD'),
    database: configService.get('POSTGRES_DB'),
    synchronize: false,
};

export const typeOrmConfig: TypeOrmModuleOptions = {
    ...postgresConfig,
    autoLoadEntities: true,
};

export const dataSourceOptions = new DataSource({
    ...postgresConfig,
    entities: [join(__dirname, '/../**/*.entity{.ts,.js}')],
    migrations: [join(__dirname, '/../src/migrations/*{.ts,.js}')],
});
