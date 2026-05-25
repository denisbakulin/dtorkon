# BACKEND_ARCHITECTURE

## Роль backend-сервиса

Backend — обязательный runtime-компонент продукта. Он отвечает за:

- авторизацию администратора;
- хранение и выдачу статей;
- управление статусами `draft/published`;
- подготовку backend upload target'ов для Yandex Object Storage;
- фиксацию загруженных assets, inline media и attachments, включая audio-вложения;
- проверку инвариантов между постами, файлами и сессиями;
- сохранение backend error events в SQLite для последующего просмотра в admin workspace; frontend runtime/network ошибки не входят в этот поток.

## Технологический baseline

- FastAPI как HTTP-слой;
- async SQLAlchemy + `aiosqlite` для доступа к SQLite;
- server-side sessions в SQLite;
- Vite dev proxy в локальном runtime и Caddy в глобальном runtime;
- Yandex Object Storage через `boto3` и S3-compatible API.

## Структура backend

- `http` — роуты, зависимости, сериализация ответов и обработка ошибок;
- `application` — use cases;
- `domain` — перечисления, ошибки и инварианты;
- `infrastructure` — config, SQLite, репозитории, security, storage.

## Auth-модель

- один администратор;
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET` читаются из env;
- backend проверяет и логин, и пароль напрямую по env-значениям;
- `dtorkon_session` выдается как `HttpOnly` cookie;
- значение cookie подписывается через `SESSION_SECRET`;
- server-side session хранится в SQLite;
- logout удаляет сессию и очищает cookie.

## API-сегменты

### Service

- `GET /api/health`

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`

### Public

- `GET /api/posts`
- `GET /api/posts/{slug}`

### Admin

- `GET /api/admin/posts`
- `GET /api/admin/posts/{post_id}`
- `POST /api/admin/posts`
- `PATCH /api/admin/posts/{post_id}`
- `POST /api/admin/uploads/presign`
- `PUT /api/admin/uploads/{asset_id}/content`
- `POST /api/admin/uploads/complete`
- `DELETE /api/admin/assets/{asset_id}`

## Upload flow

1. Админка вызывает `POST /api/admin/uploads/presign`.
2. Backend валидирует MIME type, допустимый `kind` и размер файла.
3. Backend создает `assets` со статусом `pending`.
4. Backend возвращает `uploadUrl`, `assetId`, `objectKey`, `publicUrl`, `expiresAt`.
5. Клиент делает `PUT` в backend upload endpoint.
6. Backend проверяет `Content-Type`, размер и срок жизни upload target, затем отправляет объект в Yandex Object Storage.
7. Клиент вызывает `POST /api/admin/uploads/complete`.
8. Backend переводит asset в `ready`.
9. При сохранении поста backend связывает asset либо как `cover`, либо как `attachment`, либо как tracked `inline media`, сохраняя `image | audio | file` в attachment metadata.

## Инварианты

- post не может ссылаться на несуществующий asset;
- post не может ссылаться на asset со статусом отличным от `ready`;
- `DELETE /api/admin/assets/{asset_id}` запрещен, если asset используется как cover, attachment или inline media;
- inline media отслеживается отдельной связью, а не парсингом `body_markdown`.
## Projects Showcase Update

- backend now has a dedicated `ProjectService` plus `ProjectRepository` for the portfolio showcase;
- public routes live under `/api/projects` and private CRUD lives under `/api/admin/projects`;
- project records reuse the shared asset pipeline for cover images and screenshot galleries;
- asset deletion checks now treat project covers and screenshots as in-use references.
## Admin credentials overrides

- auth still starts from `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`;
- admin can now store SQLite overrides for login/password in `app_secrets`;
- login validation and `GET /api/auth/session` use the effective credential set, where SQLite overrides take precedence over `.env`;
- clearing an override returns auth back to the bootstrap credential from `.env`.

## SQLite runtime notes

- SQLite connections enable `foreign_keys=ON` and `busy_timeout` during connect;
- file-backed runtimes also enable WAL mode with `synchronous=NORMAL` to reduce writer contention;
- admin session heartbeat updates are throttled by `session_touch_interval_seconds` so read-heavy admin traffic does not write on every request.
