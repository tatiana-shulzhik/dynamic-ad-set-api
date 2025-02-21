import { DataSource } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

ConfigModule.forRoot();

/**
 * Конфигурация подключения к базе данных Postgres
 * @typedef {Object} PostgresConfig
 * @property {string} type Тип базы данных (Postgres)
 * @property {string} host Адрес хоста базы данных
 * @property {number} port Порт для подключения
 * @property {string} username Имя пользователя для подключения
 * @property {string} password Пароль для подключения
 * @property {string} database Имя базы данных
 * @property {boolean} synchronize Устанавливает флаг синхронизации базы данных (не рекомендуется включать в продакшн)
 */
const configService = new ConfigService();

/**
 * Базовая конфигурация для подключения к базе данных
 * @type {PostgresConfig}
 */
const postgresConfig = {
    type: 'postgres' as const,
    host: configService.get('POSTGRES_HOST'),
    port: configService.get<number>('POSTGRES_PORT'),
    username: configService.get('POSTGRES_USER'),
    password: configService.get('POSTGRES_PASSWORD'),
    database: configService.get('POSTGRES_DB'),
    synchronize: false,
};

/**
 * Общая конфигурация для TypeORM, включающая автоматическую загрузку сущностей
 * @type {TypeOrmModuleOptions}
 */
export const typeOrmConfig: TypeOrmModuleOptions = {
    ...postgresConfig,
    autoLoadEntities: true,
};

/**
 * Настройки подключения к базе данных, включая пути для сущностей и миграций
 * @param {ConfigService} configService Сервис для работы с конфигурациями
 * @returns {DataSource} Экземпляр DataSource для TypeORM
 */
export const dataSourceOptions = new DataSource({
    ...postgresConfig,
    entities: [join(__dirname, '/../**/*.entity{.ts,.js}')],
    migrations: [join(__dirname, '/../src/migrations/*{.ts,.js}')],
});
