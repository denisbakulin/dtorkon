## Projects Showcase Update

### Таблица `projects`

- `id TEXT PRIMARY KEY`
- `slug TEXT NOT NULL UNIQUE`
- `title TEXT NOT NULL`
- `summary TEXT NOT NULL DEFAULT ''`
- `description TEXT NOT NULL DEFAULT ''`
- `readme_excerpt TEXT NOT NULL DEFAULT ''`
- `github_url TEXT NOT NULL DEFAULT ''`
- `status TEXT NOT NULL CHECK(status IN ('draft', 'published'))`
- `cover_asset_id TEXT NULL REFERENCES assets(id)`
- `published_at TEXT NULL`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

Stores the public/private project showcase entries that power `/projects` and the admin projects tab.

### Таблица `project_screenshots`

- `id TEXT PRIMARY KEY`
- `project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE`
- `asset_id TEXT NOT NULL REFERENCES assets(id)`
- `title TEXT NOT NULL DEFAULT ''`
- `sort_order INTEGER NOT NULL`
- `created_at TEXT NOT NULL`
- `UNIQUE(project_id, asset_id)`

Stores ordered screenshot gallery items for each project.

### Дополнительные связи

- `projects.cover_asset_id -> assets.id`
- `project_screenshots.project_id -> projects.id`
- `project_screenshots.asset_id -> assets.id`

# DATABASE

## База данных

Для проекта используется SQLite.

## Общие правила

- все даты хранятся в UTC;
- идентификаторы — `TEXT` в формате UUID, кроме одиночной записи `site_profile.id = 'default'`;
- внешние ключи включены;
- миграции versioned и воспроизводимые;
- после cleanup-миграции active schema больше не включает users, comments и Telegram-auth сущности.

## Таблица `posts`

- `id TEXT PRIMARY KEY`
- `slug TEXT NOT NULL UNIQUE`
- `title TEXT NOT NULL`
- `excerpt TEXT NOT NULL DEFAULT ''`
- `body_markdown TEXT NOT NULL`
- `status TEXT NOT NULL CHECK(status IN ('draft', 'published'))`
- `cover_asset_id TEXT NULL REFERENCES assets(id)`
- `published_at TEXT NULL`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

Хранит посты блога. Публичная витрина использует только `status = 'published'`.

## Таблица `assets`

Хранит metadata файлов, лежащих в Yandex Object Storage.

- `id TEXT PRIMARY KEY`
- `key TEXT NOT NULL UNIQUE`
- `url TEXT NOT NULL`
- `mime_type TEXT NOT NULL`
- `size_bytes INTEGER NOT NULL`
- `width INTEGER NULL`
- `height INTEGER NULL`
- `original_name TEXT NOT NULL`
- `status TEXT NOT NULL CHECK(status IN ('pending', 'ready', 'orphaned'))`
- `transcript_status TEXT NOT NULL DEFAULT 'idle'`
- `transcript_text TEXT NULL`
- `transcript_error TEXT NULL`
- `transcribed_at TEXT NULL`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

`transcript_*` поля используются для аудио- и видео-транскрибации.

## Таблица `attachments`

- `id TEXT PRIMARY KEY`
- `post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE`
- `asset_id TEXT NOT NULL REFERENCES assets(id)`
- `kind TEXT NOT NULL CHECK(kind IN ('image', 'audio', 'video', 'file'))`
- `title TEXT NOT NULL DEFAULT ''`
- `sort_order INTEGER NOT NULL`
- `created_at TEXT NOT NULL`
- `UNIQUE(post_id, asset_id)`

Хранит media/file-вложения поста.

## Таблица `post_inline_assets`

Отдельно отслеживает assets, которые вставлены в `body_markdown` как inline media.

- `id TEXT PRIMARY KEY`
- `post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE`
- `asset_id TEXT NOT NULL REFERENCES assets(id)`
- `sort_order INTEGER NOT NULL`
- `created_at TEXT NOT NULL`

Нужна, чтобы backend не считал inline media сиротскими файлами.

## Таблица `site_profile`

Хранит редактируемый профиль сайта и автора.

- `id TEXT PRIMARY KEY` 
- `site_title TEXT NOT NULL DEFAULT 'dtorkon'` 
- `site_tagline TEXT NOT NULL DEFAULT 'mini blog'` 
- `author_name TEXT NOT NULL` 
- `author_bio TEXT NOT NULL DEFAULT ''` 
- `contact_email TEXT NOT NULL DEFAULT ''` 
- `avatar_asset_id TEXT NULL REFERENCES assets(id)`
- `background_color TEXT NOT NULL DEFAULT ''`
- `background_asset_id TEXT NULL REFERENCES assets(id)`
- `updated_at TEXT NOT NULL`

По текущему контракту живет одна запись с `id = 'default'`.

## Таблица `site_profile_links`

Хранит список контактов/ссылок, отображаемых на публичной странице контактов и редактируемых из admin UI.

- `id TEXT PRIMARY KEY`
- `profile_id TEXT NOT NULL REFERENCES site_profile(id) ON DELETE CASCADE`
- `kind TEXT NOT NULL CHECK(kind IN ('email', 'phone', 'telegram', 'vk', 'link'))`
- `label TEXT NOT NULL DEFAULT ''`
- `url TEXT NOT NULL`
- `sort_order INTEGER NOT NULL`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- `UNIQUE(profile_id, sort_order)`

## Таблица `sessions`

- `id TEXT PRIMARY KEY`
- `expires_at TEXT NOT NULL`
- `created_at TEXT NOT NULL`
- `last_seen_at TEXT NOT NULL`
- `ip_hash TEXT NULL`
- `user_agent TEXT NULL`

Session storage теперь хранит только admin-only cookie sessions и не зависит от пользовательской модели.

## Таблица `error_events`

- `id TEXT PRIMARY KEY`
- `source TEXT NOT NULL CHECK(source IN ('backend', 'frontend'))`
- `level TEXT NOT NULL CHECK(level IN ('warning', 'error'))`
- `code TEXT NOT NULL`
- `message TEXT NOT NULL`
- `status_code INTEGER NULL`
- `request_method TEXT NULL`
- `request_path TEXT NULL`
- `page_url TEXT NULL`
- `details_json TEXT NULL`
- `stack_trace TEXT NULL`
- `session_id TEXT NULL REFERENCES sessions(id)`
- `user_agent TEXT NULL`
- `created_at TEXT NOT NULL`

Хранит журнал backend-ошибок и ошибок валидации, которые потом показываются в admin analytics.

## Таблица `app_secrets`

- `key TEXT PRIMARY KEY`
- `value TEXT NOT NULL`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

Хранит секреты, которые можно обновлять из админки (например, `groq_api_key` для audio/video транскрибации).

Ключи, которые используются в текущем приложении:

- `groq_api_key`
- `telegram_bot_token`
- `telegram_admin_chat_id`
- `telegram_contact_template`

## Исторические изменения

- миграция `004_multi_user_blog.sql` вводила users, comments и Telegram-first auth;
- миграция `005_admin_only_cleanup.sql` удаляет этот слой и возвращает схему к single-author admin-only модели.

## Ключевые связи

- `posts.cover_asset_id -> assets.id`
- `attachments.post_id -> posts.id`
- `attachments.asset_id -> assets.id`
- `post_inline_assets.post_id -> posts.id`
- `post_inline_assets.asset_id -> assets.id`
- `site_profile.avatar_asset_id -> assets.id`
- `site_profile_links.profile_id -> site_profile.id`
- `error_events.session_id -> sessions.id`

Текущее приложение пишет новые записи в `error_events` только из backend-слоя. Значение `frontend` оставлено в схеме для совместимости со старыми локальными базами и не используется активным API-потоком.
