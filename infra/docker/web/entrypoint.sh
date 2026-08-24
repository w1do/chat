#!/bin/sh
# Рендер /config.json из config.template.json переменными окружения.
# Благодаря этому образ SPA не пересобирается при смене домена/параметров
# (STRUCTURE.md §5, runtime-config).
set -eu

: "${API_BASE_URL:=/api/v1}"
# Пустые значения означают «тот же origin, что и страница» (см. app/echo.ts).
: "${REVERB_HOST:=}"
: "${REVERB_PORT:=}"
: "${REVERB_SCHEME:=}"
: "${REVERB_APP_KEY:=}"
: "${AI_ENABLED:=false}"
: "${APP_NAME:=Self-Hosted Chat}"

export API_BASE_URL REVERB_HOST REVERB_PORT REVERB_SCHEME REVERB_APP_KEY AI_ENABLED APP_NAME

envsubst < /usr/share/nginx/config.template.json > /usr/share/nginx/html/config.json

echo "config.json rendered for ${APP_NAME}"
