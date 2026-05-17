# SECURITY

## Базовая модель угроз

В первой версии проект защищает:

- приватную админку;
- сессионную cookie;
- credentials для Yandex Object Storage;
- целостность статей и вложений.

## Auth

- один администратор;
- `ADMIN_PASSWORD` хранится только в env и сверяется backend напрямую;
- в production `ADMIN_PASSWORD` должен быть длинным и уникальным, потому что это bootstrap-credential без отдельного hash-слоя;
- `SESSION_SECRET` используется для подписи cookie session token;
- неуспешные логины не должны раскрывать детали.

## Session cookies

Cookie `dtorkon_session` должна быть:

- `HttpOnly`;
- подписанной на стороне backend;
- `Secure` в production;
- `SameSite=Lax`;
- ограниченной по сроку жизни;
- очищаемой при logout и истекшей сессии.

## Upload restrictions

Upload flow должен проверять:

- MIME type;
- размер файла;
- допустимый `kind`;
- срок жизни upload target;
- корректность завершения upload flow.

## Yandex Object Storage

- запись в bucket идет только через backend;
- публичная раздача идет через `PUBLIC_STORAGE_BASE_URL`;
- access keys не должны попадать во frontend bundle;
- backend не должен отдавать raw credentials клиенту.
