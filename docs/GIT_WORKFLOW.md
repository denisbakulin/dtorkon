# GIT_WORKFLOW

## Базовая модель

- основная ветка — `main`;
- рабочие ветки создаются от `main`;
- рекомендуемый префикс веток — `codex/`;
- одна ветка должна содержать одну логически цельную задачу.

## Коммиты

Используется Conventional Commits:

- `feat`
- `fix`
- `refactor`
- `docs`
- `test`
- `chore`
- `style`
- `perf`

Примеры:

- `feat(api): add admin post endpoints`
- `docs(architecture): define yandex storage upload flow`
- `fix(frontend): preserve attachment sort order`

## Doc-sync rule

Любое изменение логики обязано обновить связанные документы в той же ветке.

Минимальные обязательные пары:

- API change → `openapi.json` + `docs/API_GUIDE.md`
- DB change → `docs/DATABASE.md`
- backend flow change → `docs/BACKEND_ARCHITECTURE.md`
- frontend flow change → `docs/FRONTEND_ARCHITECTURE.md`
- deploy/env change → `docs/DEVOPS_DEPLOY.md` + `README.md`
