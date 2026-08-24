# Обновление

Статус: in progress

Релизы следуют SemVer; образы закреплены по версиям (`CHAT_API_IMAGE`,
`CHAT_WEB_IMAGE` в `.env`).

## Процедура

1. Прочитайте upgrade notes релиза (GitHub Release).
2. Сделайте backup БД (см. backup-restore.md).
3. Обновите версии образов в `.env`.
4. Примените:
   ```bash
   docker compose --env-file .env -f compose.prod.yaml pull
   docker compose --env-file .env -f compose.prod.yaml up -d
   docker compose -p chat exec api php artisan migrate --force
   ```
5. Graceful reload (код в памяти long-running процессов):
   ```bash
   ./tools/chat deploy reload
   ```
6. Проверьте `/up` и `/api/v1/readiness`.

## Откат

Верните предыдущие версии образов в `.env` и повторите `up -d`. Миграции
вперёд-несовместимого отката не имеют — восстанавливайте БД из backup
(post-release миграции пишутся только forward, CLAUDE.md §12).

Автоматические миграции при старте контейнера выключены по умолчанию
(`AUTO_MIGRATE=false` в entrypoint) — включайте осознанно.
