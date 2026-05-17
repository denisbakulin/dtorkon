# API_GUIDE

## Каноничность

`openapi.json` остается главным источником правды для API.

Этот документ фиксирует рабочую картину по маршрутам и их назначению. Если код и текст расходятся, ориентиром остается `openapi.json`, а документ должен обновляться в том же изменении.

## Общие правила

- все бизнесовые request/response payload отдаются в JSON;
- публичная часть API доступна без авторизации;
- приватные admin-маршруты используют cookie `dtorkon_session`;
- ошибки возвращаются в формате `error.code + error.message`;
- backend errors дополнительно сохраняются в SQLite для просмотра в admin analytics;
- публичные посты адресуются по `slug`, приватные author-маршруты по `id`;
- `AttachmentKind` поддерживает `image | audio | video | file`;
- asset-модель включает поля транскрибации: `transcriptStatus`, `transcriptText`, `transcriptError`, `transcribedAt`.

## Health

### `GET /api/health`

Проверяет, что backend поднят и отвечает.

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

## Admin: аналитика

### `GET /api/admin/analytics`

Возвращает агрегаты для author workspace.

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
- `publicationActivity[]`
- `uploadActivity[]`
- `assetBreakdown[]`
- `totalErrors`
- `lastErrorAt`
- `recentErrors[]`

`recentErrors[]` и агрегаты ошибок в admin analytics сейчас backend-only: frontend runtime/network ошибки не принимаются и не включаются в эти значения.

## Admin: посты и редактор

### `GET /api/admin/posts`

Список постов для author workspace.

Query-параметры:

- `status = all | draft | published`
- `q`

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

## Что важно для frontend

- публичный сайт не показывает ссылку на админку;
- production-admin доступ живет на `admin.denisbakulin.ru`;
- локально author routes можно открывать через `localhost` и путь `/admin`;
- public `/blog` использует `q` для быстрого поиска по постам;
- audio и video лучше рендерить из `kind` и `mimeType`, а не только по названию файла;
- theme/accent остаются локальными настройками браузера и больше не завязаны на пользовательский профиль.
