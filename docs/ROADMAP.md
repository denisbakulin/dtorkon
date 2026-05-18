# ROADMAP

## Stage 0 — Docs-First Reboot

Статус: завершен.

## Stage 1 — Backend Foundation

Статус: завершен.

- FastAPI backend поднят;
- SQLite подключен через async SQLAlchemy;
- auth, public/admin API и `/api/health` реализованы;
- storage-каркас работает через Yandex Object Storage по S3 API;
- runtime приведен к схеме `web + api + sqlite`.

## Stage 2 — Public Blog

Статус: завершен.

- frontend подключен к `GET /api/posts`;
- страница статьи подключена к `GET /api/posts/{slug}`;
- `/blog` стал реальной публичной витриной;
- markdown rendering публичной статьи уже работает;
- главная страница показывает последние публикации.

## Stage 3 — Admin Experience

Статус: завершен.

- реализованы `/admin`, `/admin/login`, `/editor/new`, `/editor/:postId`;
- собран shell редактора: список постов, единый compose-surface, media dock и встроенный preview;
- подключены создание, редактирование и публикация записей;
- реализованы login flow, cover picker и attachments list.

## Stage 4 — Media And Files

Статус: завершен в коде, ожидает runtime-подтверждения.

- backend-mediated prepare/upload/complete flow доведен до реального UI;
- закрыты сценарии cover, tracked inline media, audio-attachments и attachments block;
- реализовано удаление неиспользуемых assets;
- ограничения по MIME type и размеру синхронизированы в UI и backend, включая voice-note flow.

## Stage 5 — Runtime Verification

Статус: в работе.

- пройти локальный smoke QA для `web + api + sqlite`;
- проверить глобальный compose-сценарий на домене;
- убедиться в корректной работе cookie, S3 storage и reverse proxy;
- обновить operational notes после первого полного прогона.
