#!/bin/sh
# Entrypoint API-контейнера. Один основной процесс: команда передаётся через CMD
# (octane / horizon / schedule:work / reverb — задаётся compose-сервисом).
set -eu

# Автоматические миграции выполняются только при явном указании (см. ADR-007 и
# docs/operations/upgrade.md — стратегия с backup/rollback планом).
if [ "${AUTO_MIGRATE:-false}" = "true" ]; then
    php artisan migrate --force
fi

# Кэши конфигурации/маршрутов для production
if [ "${APP_ENV:-production}" = "production" ]; then
    php artisan config:cache
    php artisan route:cache
    php artisan event:cache
fi

exec "$@"
