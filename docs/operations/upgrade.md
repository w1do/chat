# Обновление

Статус: in progress

Релизы следуют SemVer; образы закреплены по версиям (`CHAT_API_IMAGE`,
`CHAT_WEB_IMAGE` в `.env`).

## Процедура

1. Прочитайте upgrade notes релиза (GitHub Release).
2. Сделайте backup БД и файлов хранилища (см. backup-restore.md).
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

## Обновление до версии с обязательным хранилищем

Объектное хранилище стало обязательным компонентом (ADR-011). Установка,
поднятая раньше без профиля `s3`, требует одного дополнительного шага.

1. Добавьте в `.env` ключи хранилища (пароль — не короче восьми символов):
   ```
   S3_ACCESS_KEY_ID=chat
   S3_SECRET_ACCESS_KEY=<свой пароль>
   ```
   Своё S3-совместимое хранилище вместо встроенного — добавьте `S3_ENDPOINT`.
2. Поднимите стек обычной командой: сервис хранилища появится сам, бакет
   создастся при старте.
3. Убедитесь, что всё на месте:
   ```bash
   curl https://<домен>/api/v1/readiness    # storage: ok
   ./tools/chat smoke storage
   ```

Без этих переменных стек не поднимется, а не сломается позже при первой
загрузке файла: `compose.prod.yaml` требует их явно.
