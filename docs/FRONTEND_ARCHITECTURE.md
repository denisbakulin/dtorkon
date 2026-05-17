# FRONTEND_ARCHITECTURE

## Цели frontend-слоя

Frontend покрывает две поверхности:

- публичный блог для чтения;
- приватную админку для создания и публикации контента.

Целевой стиль — минималистичный MUI-интерфейс с ощущением Telegram: чистые поверхности, аккуратные разделители, спокойные акценты и высокая читаемость.

## Маршруты

### Public

- `/` — navigation-first главный экран с превью последних публикаций;
- `/blog` — публичная витрина материалов;
- `/posts/:slug` — страница статьи;
- `/contact` — страница связи.

### Admin

- `/admin` — экран логина или вход в editor shell;
- `/admin/posts/new` — создание записи;
- `/admin/posts/:postId` — редактирование записи.

## Public UI

### Главная страница

Включает:

- верхнюю навигацию;
- короткий вводный блок;
- явные переходы в `Блог`, `Связь` и `Admin`;
- секцию последних публикаций из API.

### Блог

Маршрут `/blog` использует `GET /api/posts` и включает:

- выделенную свежую публикацию;
- сетку остальных материалов;
- пагинацию;
- empty/error/loading states.

### Страница статьи

Маршрут `/posts/:slug` использует `GET /api/posts/{slug}` и включает:

- заголовок;
- `excerpt`;
- cover image;
- markdown-тело;
- attachments block с изображениями, файлами и аудио.

Публичная статья и preview в админке опираются на один markdown renderer.

## Admin UI

Editor shell включает:

- login panel на `/admin`;
- список постов с поиском и фильтром статуса;
- единый compose-surface для `title`, `slug`, `excerpt`, `status` и `bodyMarkdown`;
- встроенный live preview с тем же renderer, что и публичная статья, без постоянной отдельной правой панели;
- компактный media dock для cover, inline media и attachments block, плюс встроенную запись голосовых для вложений.

Inline media flow работает так:

1. автор загружает image, audio или file;
2. UI проходит prepare/backend-upload/complete;
3. asset попадает в tracked `inlineAssets`;
4. markdown-сниппет автоматически вставляется в `bodyMarkdown`.

## Навигация

- desktop-навигация работает из верхней панели;
- mobile-навигация открывается через drawer;
- `/admin` остается доступным и с desktop, и с mobile-навигации.

## State and Data Flow

- Axios остается базовым HTTP-клиентом;
- public pages получают данные из backend API;
- auth state опирается на session cookie;
- admin shell хранит draft отдельно для cover, inline assets и attachments;
- upload flow в админке имеет состояния `idle`, `presigning`, `uploading`, `completing`, `error`, а браузер передает файлы только в backend API;
- запись голосовых использует `MediaRecorder`, а после остановки отправляет результат в тот же attachment upload flow;
- при пустом `file.type` frontend восстанавливает MIME по расширению файла, чтобы ограничения совпадали с backend.
