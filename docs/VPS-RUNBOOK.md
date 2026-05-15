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
- дождитесь, пока домен начнет резолвиться на сервер.

Практически безопасный порядок такой:

1. сначала проверить, что DNS уже смотрит на VPS;
2. затем поднять контейнеры;
3. после появления валидного origin-сертификата использовать end-to-end TLS режим в Cloudflare.

## 4. Создайте `.env`

```bash
cp .env.example .env
```

Пример:

```env
DOMAIN_NAME=example.com
LETSENCRYPT_EMAIL=admin@example.com
CERT_CHECK_INTERVAL=21600
```

## 5. Поднимите проект

```bash
docker compose up -d --build
```

Что произойдет:

- соберется React-фронтенд;
- Nginx начнет раздавать статику;
- если реального сертификата ещё нет, временно поднимется self-signed сертификат;
- контейнер `certbot` начнет цикл выпуска и продления сертификата для `DOMAIN_NAME`.

## 6. Проверьте контейнеры и выпуск сертификата

```bash
docker compose ps
docker compose logs -f landing
docker compose logs -f certbot
```

Если DNS уже указывает на VPS, в логах `certbot` должна появиться успешная выдача сертификата. Если нет — он продолжит повторять попытки автоматически.

## 7. Проверьте Cloudflare SSL/TLS

Когда origin уже получил валидный сертификат, в Cloudflare лучше использовать режим, при котором сертификат на origin реально проверяется.

Если сертификат ещё не выпущен, слишком раннее включение строгой проверки может дать ошибку доступа к origin. После успешной выдачи сертификата переведите домен на строгий end-to-end TLS режим.

## 8. Финальная проверка

Проверьте:

- `http://example.com` перенаправляет на HTTPS;
- `https://example.com` открывает лендинг;
- `https://example.com/site-config.json` отдается с того же origin;
- в браузере нет ошибок сертификата на origin-пути.

## Полезные команды

Пересобрать и перезапустить:

```bash
docker compose up -d --build
```

Перезапустить только certbot:

```bash
docker compose restart certbot
```

Остановить проект:

```bash
docker compose down
```
