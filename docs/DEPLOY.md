# Deploy Notes

## Что уже настроено

- фронтенд собирается внутри `infra/caddy/Dockerfile`;
- Caddy отдает содержимое `dist` как обычную статику;
- HTTPS и выпуск сертификатов встроены в сам Caddy;
- сертификаты и runtime-конфиг сохраняются в docker volumes `caddy-data` и `caddy-config`;
- отдельный `certbot` и ручные TLS-скрипты больше не используются.

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

- `DOMAIN_NAMES=example.com`
- `LETSENCRYPT_EMAIL=admin@example.com`

Если нужен и `www`, просто укажите оба имени через пробел:

```env
DOMAIN_NAMES=example.com www.example.com
LETSENCRYPT_EMAIL=admin@example.com
```

## Как это работает

- Caddy слушает `80` и `443`;
- если домен уже указывает на VPS, Caddy сам получает сертификат;
- после получения сертификата Caddy сам же обслуживает его продление;
- SPA-маршруты отдаются через `try_files`-аналог на стороне Caddy, поэтому React-роуты не ломаются.

## Первый запуск

```bash
docker compose up -d --build
```

Если это миграция со старой `nginx/certbot` версии проекта, безопаснее один раз пересоздать volumes:

```bash
docker compose down -v
docker compose up -d --build
```

## Что нужно для выпуска сертификата

- домен уже резолвится на IP VPS;
- входящие порты `80/tcp` и `443/tcp` открыты;
- записи домена работают в режиме обычного DNS, если ты не используешь Cloudflare proxy;
- `LETSENCRYPT_EMAIL` заполнен реальной почтой.

## Проверка

Смотри контейнер и логи:

```bash
docker compose ps
docker compose logs -f landing
```

После успешного старта проверь:

- `http://example.com` редиректится на HTTPS;
- `https://example.com` открывает лендинг;
- `https://example.com/site-config.json` отдается с того же origin.
