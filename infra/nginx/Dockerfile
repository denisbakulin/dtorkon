FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine

RUN apk add --no-cache openssl

COPY infra/nginx/templates/default.conf.template /etc/nginx/templates/default.conf.template
COPY infra/nginx/docker-entrypoint.d/40-generate-fallback-cert.sh /docker-entrypoint.d/40-generate-fallback-cert.sh
COPY infra/nginx/docker-entrypoint.d/50-watch-certs.sh /docker-entrypoint.d/50-watch-certs.sh
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

RUN chmod +x /docker-entrypoint.d/40-generate-fallback-cert.sh /docker-entrypoint.d/50-watch-certs.sh

EXPOSE 80 443

