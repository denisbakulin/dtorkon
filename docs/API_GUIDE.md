## Projects Showcase Update

### `GET /api/projects`

Returns the published project showcase list. Each item includes:

- `slug`
- `title`
- `summary`
- `description`
- `githubUrl`
- `coverAsset`
- `screenshotCount`
- `publishedAt`

### `GET /api/projects/{slug}`

Returns one published project entry with the full showcase payload:

- `summary`
- `description`
- `readmeExcerpt`
- `githubUrl`
- `coverAsset`
- `screenshots[]`

Screenshots are image-only assets and are rendered as a gallery/carousel on the public project page.

### `GET /api/admin/projects`

Returns admin-side project cards for the private showcase editor.

Query params:

- `status = all | draft | published`
- `q`

### `GET /api/admin/projects/{project_id}`

Returns the full editable project record for `/admin`, including:

- `coverAsset`
- `screenshots[]`
- `readmeExcerpt`
- `githubUrl`

### `POST /api/admin/projects`

Creates a new showcase project.

Main payload fields:

- `title`
- `slug`
- `summary`
- `description`
- `readmeExcerpt`
- `githubUrl`
- `status`
- `coverAssetId`
- `screenshots[]`

### `PATCH /api/admin/projects/{project_id}`

Partially updates an existing project. Supports the same fields as create.

### `DELETE /api/admin/projects/{project_id}`

Deletes the project record. Referenced uploaded assets remain in storage unless deleted separately.

# API_GUIDE

## Каноничность

`openapi.json` остается главным источником правды для API.

Этот документ фиксирует рабочую картину по маршрутам и их назначению. Если код и текст расходятся, ориентиром остается `openapi.json`, а документ должен обновляться в том же изменении.

## Общие правила

- все бизнесовые request/response payload отдаются в JSON;
- публичная часть API доступна без авторизации;
- приватные admin-маршруты используют cookie `dtorkon_session`;
- ошибки возвращаются в формате `error.code + error.message`;
- неожиданные ошибки базы и upstream-интеграций нормализуются в contract-level коды вроде `database_unavailable`, `database_error`, `upstream_timeout`, `upstream_request_failed`;
- backend errors дополнительно сохраняются в SQLite для просмотра в admin analytics;
- публичные посты адресуются по `slug`, приватные author-маршруты по `id`;
- `AttachmentKind` поддерживает `image | audio | video | file`;
- asset-модель включает поля транскрибации: `transcriptStatus`, `transcriptText`, `transcriptError`, `transcribedAt`.

## Health

### `GET /api/health`

Проверяет, что backend поднят и отвечает.

## Status

### `GET /api/status`

Возвращает агрегированный runtime-статус для публичной страницы `/status`.

Что входит в ответ:

- общий `status` (`ok | degraded | error`);
- `generatedAt` и `backendStatus`;
- `host` с CPU, load average, памятью, диском и uptime, если подключён `node_exporter`;
- `containers[]` с CPU, RAM, filesystem и network counters, если подключён `cAdvisor`;
- `sources[]` со статусом каждого источника мониторинга;
- `uptimeKuma`, если настроены `UPTIME_KUMA_BASE_URL` и `UPTIME_KUMA_STATUS_SLUG`.

Особенности:

- endpoint публичный и не требует авторизации;
- если часть источников не настроена или недоступна, backend всё равно отвечает, но общий статус может стать `degraded`;
- CPU для контейнеров и хоста считается по delta между последовательными опросами, поэтому после первого открытия `/status` часть CPU-полей может кратко отображаться как `null`.

## Auth

### `POST /api/auth/login`

Создает admin-сессию.

- принимает `username` и `password`;
- создает server-side session;
- выставляет `HttpOnly` cookie.

### `GET /api/auth/session`

Возвращает текущую admin-сессию.

Ключевые поля:

- `adminDisplayName`
- `expiresAt`

### `POST /api/auth/logout`

- завершает текущую admin-сессию;
- очищает cookie.
- идемпотентен: возвращает `204` даже если сессии уже нет/она истекла.

## Публичный сайт

### `GET /api/site-profile`

Возвращает публичные данные автора и контактов сайта.

Ключевые поля:

- `siteTitle` 
- `siteTagline` 
- `siteTitle` 
- `siteTagline` 
- `authorName` 
- `authorBio`
- `contactEmail`
- `links[]` (`email | phone | telegram | vk | link`)
- `avatarAsset`
- `backgroundColor`
- `backgroundAsset`
- `updatedAt`

### `POST /api/contact/messages`

Отправляет сообщение из публичной формы связи в Telegram-чат админа через Bot API.

Payload:

- `contact`
- `message`

Ответ: `204 No Content`.

Ошибки:

- `503 contact_not_configured` — нет bot token и/или admin chat id;
- `503 contact_delivery_failed` — Telegram API не принял запрос.

### `GET /api/posts`

Возвращает только опубликованные статьи.

Query-параметры:

- `page`
- `pageSize`
- `q`

`q` делает простой substring-поиск по `title`, `excerpt` и `body_markdown`.

### `GET /api/posts/{slug}`

Возвращает полную опубликованную статью.

Ключевые поля:

- `title`
- `excerpt`
- `bodyMarkdown`
- `coverAsset`
- `attachments`
- `publishedAt`
- `updatedAt`

### `GET /api/media`

Возвращает вложения (attachments) из опубликованных постов, с фильтрацией по типу.

Query-параметры:

- `page`
- `pageSize`
- `kind` (`image | audio | video | file`)

## Admin: аналитика

### `GET /api/admin/analytics/overview`

Возвращает только counters для admin dashboard.

Ключевые поля:

- `totalPosts`
- `publishedPosts`
- `draftPosts`
- `totalAssets`
- `readyAssets`
- `totalWords`
- `totalAttachments`
- `transcriptReady`
- `transcriptProcessing`
- `transcriptFailed`
- `totalErrors`
- `lastErrorAt`

### `GET /api/admin/analytics/activity`

Возвращает только данные для charts и breakdown blocks.

- `publicationActivity[]`
- `uploadActivity[]`
- `assetBreakdown[]`

### `GET /api/admin/analytics/storage`

Возвращает analytics для Yandex Object Storage:

- `enabled`, `metricsConfigured`, `logsConfigured`
- `bucketName`, `logBucketName`, `message`
- `usedSizeBytes`, `objectCount`
- `publicReadEnabled`, `publicListEnabled`
- `totalIncomingBytes`, `totalOutgoingBytes`
- `totalRequests`, `readRequests`, `writeRequests`
- `lastLogAt`
- `trafficTimeline[]` с входящим/исходящим трафиком и request counters по дням
- `methodBreakdown[]`
- `topObjects[]`
- `topObjectsPagination`

Query-параметры:

- `page >= 1`
- `page_size = 1..50`

### `GET /api/admin/analytics/errors`

Возвращает paginated backend error log для admin UI:

- `items[]`
- `pagination`
- `totalErrors`
- `lastErrorAt`

Query-параметры:

- `page >= 1`
- `page_size = 1..50`

`items[]` и агрегаты ошибок в admin analytics сейчас backend-only: frontend runtime/network ошибки не принимаются и не включаются в эти значения.

Практически это работает так:

- bucket size и traffic графики backend читает из Yandex Monitoring API и Object Storage bucket stats API;
- top requested files и request-method breakdown backend собирает из access logs бакета;
- если bucket stats API временно недоступен, backend пытается показать размер бакета и object count через S3 listing fallback и отражает это в `message`;
- если настроена только часть интеграции, endpoint всё равно отвечает, а `message` объясняет, чего не хватает.

## Admin: посты и редактор

### `GET /api/admin/posts`

Список постов для admin editor.

Query-параметры:

- `page >= 1`
- `page_size = 1..50`
- `status = all | draft | published`
- `q`

Ответ пагинируется и возвращает:

- `items[]`
- `pagination.page`
- `pagination.pageSize`
- `pagination.totalItems`
- `pagination.totalPages`

### `GET /api/admin/posts/{post_id}`

Возвращает полную запись для редактирования.

Ключевые поля detail-ответа:

- `coverAsset`
- `inlineAssets`
- `attachments`
- `bodyMarkdown`

### `POST /api/admin/posts`

Создает новый пост.

Ключевые поля payload:

- `title`
- `slug`
- `excerpt`
- `bodyMarkdown`
- `status`
- `coverAssetId`
- `inlineAssetIds`
- `attachments[]`

### `PATCH /api/admin/posts/{post_id}`

Частично обновляет существующий пост.

Поддерживает те же поля, что и create, но опционально.

### `DELETE /api/admin/posts/{post_id}`

Удаляет пост.

Файлы при этом не обязаны удаляться из storage автоматически: привязки к посту снимаются отдельно от lifecycle asset-объектов.

## Admin: профиль сайта

### `GET /api/admin/site-profile`

Возвращает редактируемые данные автора и контактов для admin UI.

### `PATCH /api/admin/site-profile`

Обновляет публичные данные автора и контактов.

Поддерживаемые поля:

- `authorName`
- `authorBio`
- `contactEmail`
- `links[]` (элементы: `kind`, `label`, `url`)
- `avatarAssetId`
- `backgroundColor`
- `backgroundAssetId`

## Upload и media lifecycle

### `POST /api/admin/uploads/presign`

Подготавливает backend upload target для Yandex Object Storage и создает `pending` asset.

Payload:

- `originalName`
- `mimeType`
- `size`
- `kind`

### `PUT /api/admin/uploads/{asset_id}/content`

Принимает бинарное тело файла через backend upload flow.

- проверяет `Content-Type`;
- проверяет размер;
- проверяет срок жизни upload target;
- пишет объект в Yandex Object Storage серверными credentials.

### `POST /api/admin/uploads/complete`

Переводит asset в `ready` и фиксирует дополнительные metadata.

Полезные поля payload:

- `assetId`
- `width`
- `height`

### `DELETE /api/admin/assets/{asset_id}`

Удаляет asset, если он больше не используется как cover, attachment, avatar или inline media.

## Транскрибация

### `POST /api/admin/assets/{asset_id}/transcribe`

Запускает транскрибацию audio/video asset через Groq Speech-to-Text.

Результат сохраняется прямо в asset:

- `transcriptStatus`
- `transcriptText`
- `transcriptError`
- `transcribedAt`

### `PATCH /api/admin/assets/{asset_id}/transcript`

Позволяет вручную отредактировать уже сохраненный transcript у audio/video asset.

Payload:

- `transcriptText`

После обновления backend возвращает тот же asset с `transcriptStatus = ready`, очищенным `transcriptError` и новым `transcribedAt`.

### `DELETE /api/admin/assets/{asset_id}/transcript`

Сбрасывает transcript у audio/video asset обратно в состояние `idle`.

Backend очищает:

- `transcriptText`
- `transcriptError`
- `transcribedAt`

### `GET /api/admin/settings/transcription`

Возвращает статус конфигурации транскрибации.

- `groqConfigured` — настроен ли Groq API key (учитывает `.env` и ключ, сохраненный в SQLite);
- `groqApiBase`, `groqSpeechModel` — технические параметры backend.

### `PUT /api/admin/settings/transcription/groq-api-key`

Сохраняет Groq API key в SQLite (`app_secrets.key = 'groq_api_key'`). Используется для транскрибации, если ключа нет в `.env` или нужно переопределить/ротировать его без деплоя.

Payload:

- `apiKey`

### `DELETE /api/admin/settings/transcription/groq-api-key`

Удаляет сохраненный в SQLite Groq API key.

## Связь (Telegram)

### `GET /api/admin/settings/telegram`

Возвращает Telegram-настройки формы связи.

- `botConfigured` — настроен ли bot token (учитывает `.env` и/или ключ в SQLite);
- `adminChatId` — chat id (user/group), куда пересылать сообщения;
- `messageTemplate` — шаблон текста (переменные: `{contact}`, `{message}`, `{ip}`).

### `PUT /api/admin/settings/telegram/bot-token`

Сохраняет Telegram bot token в SQLite (`app_secrets.key = 'telegram_bot_token'`).

Payload:

- `apiKey`

### `DELETE /api/admin/settings/telegram/bot-token`

Удаляет сохранённый в SQLite Telegram bot token.

### `PUT /api/admin/settings/telegram/admin-chat-id`

Сохраняет Telegram admin chat id в SQLite (`app_secrets.key = 'telegram_admin_chat_id'`).

Payload:

- `adminChatId`

### `PUT /api/admin/settings/telegram/message-template`

Сохраняет шаблон сообщения в SQLite (`app_secrets.key = 'telegram_contact_template'`).

Payload:

- `messageTemplate`

## Что важно для frontend

- публичный сайт не показывает ссылку на админку;
- приватная админ-зона живет на `https://<PUBLIC_DOMAIN>/admin`;
- локально author routes можно открывать через `localhost` и путь `/admin`;
- public `/blog` использует `q` для быстрого поиска по постам;
- audio и video лучше рендерить из `kind` и `mimeType`, а не только по названию файла;
- theme/accent остаются локальными настройками браузера и больше не завязаны на пользовательский профиль.
## Admin credentials overrides

### `GET /api/admin/settings/credentials`

Returns the effective admin login plus whether the current login/password come from SQLite overrides instead of `.env`.

Response fields:

- `adminUsername`
- `usernameOverridden`
- `passwordOverridden`

### `PUT /api/admin/settings/credentials`

Updates the admin login and/or password override stored in `app_secrets`.

Payload:

- `username`
- `password`

Notes:

- a non-empty value stores a new override in SQLite;
- an empty string clears the override and falls back to the bootstrap credential from `.env`;
- auth endpoints now validate credentials against the effective value, where SQLite overrides win over `.env`.
