# CURRENT_STAGE

## Актуальная стадия

Проект находится в стадии `Admin-Only Authoring Runtime`.

Текущий рабочий scope:

- публичный блог с поиском `q`;
- отдельная закрытая админка для одного автора;
- admin-only cookie auth без Telegram, пользователей и комментариев;
- скрытый production-вход через `admin.denisbakulin.ru`;
- редактируемые публичные данные автора и контактов сайта;
- встроенная аналитика по постам, загрузкам и состоянию медиа;
- кастомные audio/video панели;
- image editor перед загрузкой изображения;
- markdown-редактор на базе готовой библиотеки;
- опциональная транскрибация audio/video asset-ов.

Из scope сознательно убраны:

- Telegram auth и bot flows;
- пользовательские профили;
- комментарии;
- public/admin роли кроме одного автора.

## Что уже считается готовым

- `openapi.json` генерируется из FastAPI-приложения;
- backend работает на `FastAPI + async SQLAlchemy + SQLite`;
- storage-слой использует Yandex Object Storage через S3 API;
- frontend использует единый admin session state через `/api/auth/session`;
- production-admin вынесен на отдельный host `admin.denisbakulin.ru`;
- локально author workspace остается доступным через `/admin`;
- публичный `/blog` поддерживает поиск через `q`;
- public `/posts/:slug` показывает статью и вложения без комментариев;
- author workspace умеет:
  - создавать, редактировать и удалять посты;
  - работать с cover, inline media и attachments;
  - загружать `image | audio | video | file`;
  - открывать image editor перед image upload;
  - редактировать Markdown через `MDXEditor`;
  - просматривать audio/video через кастомный player;
  - запускать транскрибацию audio/video asset-ов;
  - редактировать публичные данные автора и контакты;
  - смотреть внутреннюю аналитику по публикациям и assets.

## Что еще не подтверждено живым runtime-прогоном

- полный глобальный сценарий через реальный `admin.denisbakulin.ru` и Caddy;
- smoke QA по всем admin-host маршрутам после деплоя;
- production-путь для Groq transcription на живых больших медиа;
- bundle warning по размеру frontend-сборки все еще остается и требует отдельного этапа code-splitting для тяжелых editor/media библиотек.

## Ближайший исполнимый backlog

1. Поднять локальный runtime `web + api + sqlite` и пройти browser smoke QA.
2. Проверить host-gating:
   - публичный host не показывает admin entry points;
   - локальный `/admin` работает;
   - admin host открывает login и workspace как отдельную поверхность.
3. Пройти руками сценарии:
   - поиск по постам;
   - создание, публикация и удаление поста;
   - редактирование author/site contact данных;
   - транскрибация audio/video asset;
   - просмотр аналитики в overview.
4. Вынести тяжелые author-only библиотеки в более агрессивные lazy chunks, чтобы облегчить публичный bundle.

## Definition Of Done для следующего этапа

Следующий этап можно считать завершенным, когда:

- локальный runtime поднимается без ручных обходов;
- публичный интерфейс не светит админские ссылки;
- автор может открыть admin-only host, войти, создать, найти и удалить хотя бы один пост;
- analytics, site profile editing и media flow подтверждены руками;
- документация и `openapi.json` остаются синхронными с кодом и проверенным runtime.
