FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM caddy:2.10-alpine

COPY infra/caddy/Caddyfile.local /etc/caddy/Caddyfile.local
COPY infra/caddy/Caddyfile.global /etc/caddy/Caddyfile.global
COPY --from=frontend-builder /app/frontend/dist /srv

EXPOSE 80 443

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile.local", "--adapter", "caddyfile"]
