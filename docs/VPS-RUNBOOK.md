# VPS Runbook

## Что понадобится

- VPS с публичным IP;
- открытые входящие порты `80` и `443`;
- домен, которым управляет Cloudflare;
- установленный Docker Engine и Docker Compose plugin.

## 1. Подготовьте сервер

Для Ubuntu Docker рекомендует ставить Engine и Compose plugin из официального apt-репозитория.

Минимальная проверка после установки:

```bash
sudo systemctl status docker
docker compose version
sudo docker run hello-world
```

## 2. Загрузите проект на VPS

Пример рабочей директории:

```bash
sudo mkdir -p /opt/dtorkon
sudo chown $USER:$USER /opt/dtorkon
cd /opt/dtorkon
```

Дальше перенесите сюда файлы проекта любым удобным способом.

## 3. Настройте Cloudflare DNS

- создайте `A`-запись для `@`, указывающую на IP VPS;
- если нужен отдельный хост, создайте ещё и запись для него;
- если сайт должен работать без Cloudflare proxy, переключите записи в `DNS only`;
- дождитесь, пока домен начнет резолвиться на сервер.

## 4. Создайте `.env`

```bash
cp .env.example .env
```

Пример:

```env
DOMAIN_NAMES=example.com
LETSENCRYPT_EMAIL=admin@example.com
```

Если нужен и `www`, укажи оба домена через пробел:

```env
DOMAIN_NAMES=example.com www.example.com
LETSENCRYPT_EMAIL=admin@example.com
```

## 5. Поднимите проект

```bash
docker compose up -d --build
```

Что произойдет:

- соберется React-фронтенд;
- Caddy начнет раздавать статику;
- Caddy сам попробует выпустить сертификат для доменов из `DOMAIN_NAMES`;
- дальнейшее продление сертификатов будет тоже на стороне Caddy.

Если это сервер, где уже поднималась старая версия проекта на `nginx/certbot`, безопаснее сразу сделать:

```bash
docker compose down -v
docker compose up -d --build
```

## 6. Проверьте контейнеры и выпуск сертификата

```bash
docker compose ps
docker compose logs -f landing
```

Если DNS уже указывает на VPS, в логах `landing` должны появиться сообщения Caddy о запуске HTTP/HTTPS и выпуске сертификата.

## 7. Финальная проверка

Проверьте:

- `http://example.com` перенаправляет на HTTPS;
- `https://example.com` открывает лендинг;
- `https://example.com/site-config.json` отдается с того же origin;
- в браузере нет ошибок сертификата.

## Полезные команды

Пересобрать и перезапустить:

```bash
docker compose up -d --build
```

Остановить проект:

```bash
docker compose down
```
