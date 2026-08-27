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
# Одна тихая попытка восстановить истёкшую сессию вместо экрана «Сессия
# истекла». По умолчанию выключена: неверно настроенная, она прячет
# настоящий выход (docs/features/authentication.md).
: "${AUTH_SILENT_RECOVERY:=false}"
# Публичный ключ VAPID: пустой означает, что push на сервере не настроен.
: "${VAPID_PUBLIC_KEY:=}"
: "${APP_NAME:=Self-Hosted Chat}"
# Требование к паролю задаёт установка — то же значение, по которому проверяет
# сервер. Интерфейс не хранит собственного числа.
: "${PASSWORD_MIN_LENGTH:=1}"

export API_BASE_URL REVERB_HOST REVERB_PORT REVERB_SCHEME REVERB_APP_KEY AI_ENABLED AUTH_SILENT_RECOVERY APP_NAME VAPID_PUBLIC_KEY PASSWORD_MIN_LENGTH

envsubst < /usr/share/nginx/config.template.json > /usr/share/nginx/html/config.json

echo "config.json rendered for ${APP_NAME}"
