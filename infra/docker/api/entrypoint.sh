#!/bin/sh
# Entrypoint API-контейнера. Один основной процесс: команда передаётся через CMD
# (octane / horizon / schedule:work / reverb — задаётся compose-сервисом).
set -eu

# APP_KEY можно задать в окружении. Если его нет, установка генерирует ключ
# один раз и хранит его в постоянном томе: развёртывание одной командой не
# должно требовать ручных шагов, а смена ключа разлогинивает всех (см.
# docs/security/secret-rotation.md).
KEY_FILE=/app/storage/app/app_key

if [ -z "${APP_KEY:-}" ]; then
    if [ "${APP_BOOTSTRAP:-false}" = "true" ] && [ ! -f "$KEY_FILE" ]; then
        umask 077
        php artisan key:generate --show > "$KEY_FILE"
        echo "APP_KEY сгенерирован и сохранён в томе storage"
    fi

    # Остальные процессы берут тот же ключ: он общий для всей установки.
    waited=0
    while [ ! -f "$KEY_FILE" ] && [ "$waited" -lt 60 ]; do
        sleep 1
        waited=$((waited + 1))
    done

    if [ ! -f "$KEY_FILE" ]; then
        echo "APP_KEY не задан и не был сгенерирован" >&2
        exit 1
    fi

    APP_KEY="$(cat "$KEY_FILE")"
    export APP_KEY
fi

# Бакет объектного хранилища — часть установки (ADR-011): создаётся при
# первом запуске, повтор безвреден. Недоступное хранилище не роняет процесс:
# о нём честно скажет readiness, а запись в журнале объяснит, что чинить.
if [ "${APP_BOOTSTRAP:-false}" = "true" ]; then
    php artisan storage:ensure-bucket || echo "хранилище недоступно при старте — бакет будет создан командой storage:ensure-bucket" >&2
fi

# Автоматические миграции выполняются только при явном указании (см. ADR-007 и
# docs/operations/upgrade.md — стратегия с backup/rollback планом).
if [ "${AUTO_MIGRATE:-false}" = "true" ]; then
    php artisan migrate --force
fi

# Коллекция поиска создаётся при первом запуске: индекс всегда перестраиваем
# из PostgreSQL, поэтому шаг идемпотентен.
if [ "${AUTO_MIGRATE:-false}" = "true" ] && [ "${SEARCH_ENABLED:-false}" = "true" ]; then
    php artisan chat:search-reindex || echo "поиск недоступен при старте — выполните chat:search-reindex позже" >&2
fi

# Кэши конфигурации/маршрутов для production
if [ "${APP_ENV:-production}" = "production" ]; then
    php artisan config:cache
    php artisan route:cache
    php artisan event:cache
fi

exec "$@"
