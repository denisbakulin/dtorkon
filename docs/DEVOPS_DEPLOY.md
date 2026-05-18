# DEVOPS_DEPLOY

## Режимы запуска

- локальный запуск на `localhost`;
- глобальный запуск на реальном домене с двумя host-ами:
  - публичный `denisbakulin.ru`;
  - приватный `/admin` на том же домене.

## Локальный runtime

Использует:

- `docker-compose.yml`;
- сервис `web`;
- сервис `api`;
- volume `sqlite-data`;
- volume `frontend-node-modules`.

Команда:

```bash
docker compose up
```

Адрес:

```text
http://localhost:<LOCAL_HTTP_PORT>
```

Если `LOCAL_HTTP_PORT` не переопределен в `.env`, локальный runtime использует `8080`.

Локально приватная зона остается доступной через путь `/admin`.

## Глобальный runtime

Использует:

- `docker-compose.global.yml`;
- `infra/caddy/Caddyfile.global`;
- `.env`;
- Caddy с автоматическим HTTPS;
- `web + api + sqlite`.

Команда:

```bash
docker compose -f docker-compose.global.yml up -d --build
```

## Ответственность сервисов

### `web`

- в локальном режиме поднимает Node + Vite dev server;
- отдает frontend с hot reload;
- проксирует `/api/*` в `api` через Vite proxy;
- в global runtime обслуживается через Caddy и один SPA-бандл для public/admin host-ов.

### `api`

- запускает FastAPI backend через `uvicorn --reload` локально;
- использует SQLite;
- в локальном compose всегда считает `PUBLIC_APP_ORIGIN` и `ADMIN_APP_ORIGIN` localhost-origin'ами;
- принимает upload-ы через backend и отправляет их в Yandex Object Storage;
- управляет server-side admin sessions.

## Целевые env-переменные

### Ingress

- `LOCAL_HTTP_PORT`
- `GLOBAL_HTTP_PORT`
- `GLOBAL_HTTPS_PORT`
- `PUBLIC_DOMAIN`
- `LETSENCRYPT_EMAIL`
- `PUBLIC_APP_ORIGIN`
- `ADMIN_APP_ORIGIN`

### Auth

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

### Database

- `SQLITE_PATH`

### Yandex Object Storage

- `S3_BUCKET_NAME`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_ENDPOINT_URL`
- `S3_REGION`
- `PUBLIC_STORAGE_BASE_URL`

## VPS rollout sequence

1. Скопировать проект на VPS.
2. Подготовить `.env`.
3. Проверить DNS для `denisbakulin.ru`.
4. Поднять `docker compose -f docker-compose.global.yml up -d --build`.
5. Проверить логи `web` и `api`.
6. Убедиться, что:
   - публичный сайт открывается по `https://denisbakulin.ru`;
   - админка открывается по `https://denisbakulin.ru/admin`;
   - `/api/health` отвечает;
   - admin login работает;
   - public posts открываются;
   - файлы из `PUBLIC_STORAGE_BASE_URL` доступны.
