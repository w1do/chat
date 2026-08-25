# Production-образ web: статика SPA за nginx (non-root).
# Контекст сборки — корень монорепозитория:
#   docker build -f infra/docker/web/Dockerfile -t vendor/chat-web:<version> .

# --- Stage 1: build SPA ------------------------------------------------------
FROM node:22.14.0-alpine AS build

RUN corepack enable
WORKDIR /build

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/frontend/ packages/frontend/
COPY packages/contracts/ packages/contracts/
COPY apps/chat-web/ apps/chat-web/
RUN pnpm install --frozen-lockfile \
    && pnpm --filter chat-web build

# --- Stage 2: runtime --------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.28-alpine AS runtime

COPY infra/docker/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY infra/docker/web/entrypoint.sh /docker-entrypoint.d/40-render-config.sh
COPY --from=build --chown=nginx:nginx /build/apps/chat-web/dist/ /usr/share/nginx/html/
COPY apps/chat-web/public/config.template.json /usr/share/nginx/config.template.json

USER root
RUN chmod +x /docker-entrypoint.d/40-render-config.sh \
    && chown -R nginx:nginx /usr/share/nginx/html
USER nginx

EXPOSE 8080

# Именно 127.0.0.1, а не localhost: внутри контейнера тот резолвится в ::1,
# а nginx слушает IPv4 — проверка получала бы «connection refused», и
# балансировщик перестал бы маршрутизировать на живой контейнер.
HEALTHCHECK --interval=30s --timeout=5s CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
