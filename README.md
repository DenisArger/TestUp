# PocketBase — 퀴з + админ-панель

Проект на базе [PocketBase](https://pocketbase.io/) с кастомной веб-админ-панелью для управления тестами (quizzes, questions) и результатами (attempts), а также клиентской частью для прохождения тестов.

## Структура

```
.
├── pocketbase                  # бинарь PocketBase (не в git)
├── start.sh                    # локальный запуск (8090 / 8082 / 8083)
├── Dockerfile                  # образ для Amvera
├── entrypoint.sh               # точка входа контейнера
├── nginx.conf                  # nginx — единая точка входа на 8080
├── amvera.yaml                 # конфиг Amvera
├── .dockerignore               # исключения из образа
├── pb_data/                    # данные PocketBase (не в git)
├── pb_migrations/              # миграции PocketBase
├── admin_panel/                # кастомная админ-панель
├── quiz_client/                # клиент тестов
└── src/
```

## Локальный запуск

```bash
./start.sh
```

- PocketBase API: `http://localhost:8090`
- Админ-панель: `http://localhost:8082`
- Клиент тестов: `http://localhost:8083`

## Развёртывание на Amvera

Amvera собирает образ по `Dockerfile` из GitHub-репозитория (docker-compose не поддерживается).

### 1. Подготовка репозитория

Запушьте изменения на GitHub:

```bash
git add -A
git commit -m "Add Amvera deployment files"
git push origin main
```

### 2. Создание приложения в Amvera

1. Откройте [cloud.amvera.ru/projects](https://cloud.amvera.ru/projects)
2. Нажмите **Создать** → тип сервиса «приложение»
3. Подключите GitHub-репозиторий
4. Amvera найдёт `Dockerfile` и соберёт образ
5. Дождитесь статуса **«Успешно развернуто»**

### 3. Переменные окружения

В консоли Amvera (раздел «Переменные окружения») задайте:

| Переменная | Описание |
|---|---|
| `PB_ADMIN_EMAIL` | email суперадминистратора PocketBase |
| `PB_ADMIN_PASSWORD` | пароль суперадминистратора |

### 4. Адреса после деплоя

| Назначение | Путь |
|---|---|
| Клиент тестов | `/` |
| Кастомная админ-панель | `/admin/` |
| REST API PocketBase | `/api/` |
| Встроенная админка PocketBase | `/` |

Постоянное хранилище примонтировано по `/app/pb_data` — данные не сбросятся при перезапуске контейнера.

## Переменные окружения (опционально)

Никаких обязательных переменных для сборки нет. Переменные `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD` используются только для первого создания суперадмина PocketBase.

## Логи и отладка

Если статус «Выполняется запуск» длится более 5 минут — скачивайте **Лог сборки** и **Лог приложения** в консоли Amvera.

## Технологии

- PocketBase (Go-бинарь)
- Python http.server (прокси для админ-панели и клиента)
- nginx (точка входа на порт 8080)
- Vanilla JS + CSS (фронтенд)

## Лицензия

MIT — см. `LICENSE.md`.
