# Установка

Статус: implemented (runtime smoke пройден против dev-стека 2026-08-24)

Основной способ установки — Docker Compose (ADR-007).

## Требования

- Docker Engine ≥ 24 c Compose v2;
- домен, указывающий на сервер (для TLS);
- 2 CPU / 4 GB RAM минимум.

## Шаги

1. Получите релизный bundle (каталог `infra/compose` + `infra/docker/proxy`).
2. Заполните окружение:
   ```bash
   cp .env.example .env
   # заполните APP_KEY, DB_PASSWORD, REDIS_PASSWORD, REVERB_*, TYPESENSE_API_KEY
   ```
   `APP_KEY` сгенерируйте: `docker run --rm ${CHAT_API_IMAGE} php artisan key:generate --show`.
3. Настройте proxy: скопируйте `infra/docker/proxy/Caddyfile.example`, замените домен.
4. Запустите стек:
   ```bash
   docker compose --env-file .env -f compose.prod.yaml up -d
   ```
   С MinIO: добавьте `--profile s3`.
5. Примените миграции (однократно, с бэкапом — см. upgrade.md):
   ```bash
   docker compose -p chat exec api php artisan migrate --force
   ```
6. Проверьте готовность:
   - liveness: `curl https://<домен>/up`
   - readiness: `curl https://<домен>/api/v1/readiness`

## Linux/VM без Docker

Поддерживаемый вторичный профиль: процессы `octane:start`, `horizon`,
`schedule:work`, `reverb:start` под Supervisor — см. [supervisor.md](supervisor.md).
