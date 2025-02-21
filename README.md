# dynamic-ad-set-api

## Описание
Этот сервис динамически собирает Ad Set на основе дереву условий с вероятностным распределением. 
Система принимает входные параметры, проходит по дереву выбора и возвращает сформированный набор модулей.

## Запуск проекта в Docker

Проект запускается одной командой:

```sh
docker-compose up --build
```

## API

### Получение конфигурации Ad Set

**Endpoint:**
```sh
GET /config?geo=RU&device=mobile
```

**Пример ответа:**
```json
{
  "adset_id": 83476,
  "modules": [
    { "type": "push", "name": "Push A" },
    { "type": "monetization", "name": "Popunder" }
  ]
}
```

### Получение дерева конфигурации

**Endpoint:**
```sh
GET /config/all
```

**Пример ответа:**
```json
{
    "adset_id": 50799,
    "modules": {
        "push": {
            "Push A": [],
            "Push B": []
        }
    }
}
```

### Создание дерева конфигурации/узлов

**Endpoint:**
```sh
POST /config/all
```

**Тело запроса** 
```json
{
  "name": "geo",
  "modules": [
    { "name": "push2", "type": "Push A", "level": 2, "parentName": "push1" }
  ]
} 
```

**Пример ответа:**
```json
{
    "mainParameter": {
        "id": 1,
        "name": "geo"
    },
    "addedModules": [
        {
            "id": 3,
            "name": "push2",
            "level": 2,
            "parentId": 1
        }
    ]
}
```