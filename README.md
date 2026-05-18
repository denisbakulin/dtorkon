# dtorkon

`dtorkon` — мини-блог с публичной витриной и приватной авторской админкой. Репозиторий живет в docs-first режиме: продукт, архитектура, API и правила работы обновляются вместе с кодом.

## Текущее состояние

- документационный baseline собран и поддерживается актуальным;
- `openapi.json` генерируется из FastAPI-приложения;
- backend реализован на `FastAPI + async SQLAlchemy + SQLite`;
- публичный frontend подключен к реальным `GET /api/posts` и `GET /api/posts/{slug}`;
- приватная админка подключена к реальному auth/admin API;
- редактор постов собран как единый compose-flow с media dock и встроенным preview;
- backend-mediated upload flow закрывает cover, attachments, голосовые и tracked inline media;
- storage-слой работает с Yandex Object Storage через `boto3` по S3 API;
- локальный и глобальный runtime используют схему `web + api + sqlite`.

## Цель MVP

- главная страница с навигацией по сайту и превью последних публикаций;
- страница блога со списком статей;
- страница отдельной статьи по `slug`;
- приватная админка с логином;
- markdown-редактор статьи с preview;
- загрузка изображений, файлов и голосовых;
- tracked inline media для markdown-тела;
- Yandex Object Storage для медиа;
- SQLite для постов, сессий и метаданных;
- VPS-first деплой через Docker Compose и Caddy.

## Зафиксированный стек

- React + Vite;
- `react-router-dom`;
- MUI;
- Axios;
- FastAPI;
- SQLAlchemy Async + `aiosqlite`;
- Yandex Object Storage через S3 API;
- Caddy;
- Docker Compose.

## Структура репозитория

- `frontend/` — публичная часть и авторская админка;
- `backend/` — FastAPI backend, миграции и служебные скрипты;
- `infra/` — Caddy и контейнеризация;
- `docs/` — обязательная проектная документация;
- `openapi.json` — каноничный API-контракт;
- `AGENTS.md` — правила агентной работы в проекте.

## Локальный запуск

```bash
docker compose up
```

После старта сайт доступен на `http://localhost:<LOCAL_HTTP_PORT>`.
Если `LOCAL_HTTP_PORT` не переопределен, по умолчанию используется `8080`.

Локальный compose теперь работает в dev-режиме:

- `api` поднимает `uvicorn --reload`;
- `web` поднимает Vite dev server на Node;
- локальные `PUBLIC_APP_ORIGIN` и `ADMIN_APP_ORIGIN` по умолчанию указывают на `http://localhost:<LOCAL_HTTP_PORT>`;
- frontend bundle локально не пересобирается через Caddy-образ при каждом старте.

## Глобальный запуск

```bash
cp .env.example .env
docker compose -f docker-compose.global.yml up -d --build
```

Для production обязательно заполнить:

- `PUBLIC_DOMAIN`
- `LETSENCRYPT_EMAIL`
- `PUBLIC_APP_ORIGIN`
- `ADMIN_APP_ORIGIN`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `S3_BUCKET_NAME`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_ENDPOINT_URL`
- `S3_REGION`
- `PUBLIC_STORAGE_BASE_URL`

## Документы-источники правды

- `docs/PROJECT_OVERVIEW.md`
- `docs/ROADMAP.md`
- `docs/CURRENT_STAGE.md`
- `docs/BACKEND_ARCHITECTURE.md`
- `docs/FRONTEND_ARCHITECTURE.md`
- `docs/API_GUIDE.md`
- `docs/DATABASE.md`
- `docs/DEVOPS_DEPLOY.md`
- `docs/CODE_STYLE.md`
- `docs/SECURITY.md`
- `docs/GIT_WORKFLOW.md`

## Правило синхронизации

- любое изменение логики обновляет затронутые документы;
- любое изменение API обновляет `openapi.json` и `docs/API_GUIDE.md`;
- любое изменение схемы данных обновляет `docs/DATABASE.md`;
- рассинхрон между кодом и документацией считается незавершенной работой.
