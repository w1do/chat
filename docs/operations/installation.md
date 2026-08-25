# Установка

Статус: verified (`./tools/chat smoke all` пройден против production-профиля)

Основной способ установки — Docker Compose (ADR-007).

## Самый короткий путь

Корневой `docker-compose.yml` рассчитан на развёртывание одной командой — в
том числе из панелей вроде Dokploy:

```bash
git clone https://github.com/w1do/chat.git && cd chat
cp .env.example .env      # заполните APP_URL, APP_DOMAIN и пароли

# за панелью с балансировщиком (Dokploy/Traefik): портов не публикуем
docker compose up -d --build

# на голом VPS: оверлей добавляет публикацию порта
docker compose -f docker-compose.yml -f docker-compose.standalone.yml up -d --build
```

Ключ приложения генерируется при первом запуске и хранится в томе
`api-storage`; бакет хранилища, миграции и поисковый индекс создаются автоматически
(контейнер `api` поднят с `AUTO_MIGRATE=true`). Домен привязывается к сервису
`web`, порт 8080: этот контейнер отдаёт приложение и проксирует API и WebSocket
внутрь, поэтому всё отвечает с одного origin. TLS терминирует внешний
балансировщик.

Ниже — развёрнутая процедура с раздельными файлами `infra/compose/*` для
установок, где нужен полный контроль.

## Требования

- Docker Engine ≥ 24 c Compose v2;
- домен, указывающий на сервер (для TLS);
- 2 CPU / 4 GB RAM минимум.

## Шаги

1. Получите релизный bundle (каталог `infra/compose` + `infra/docker/proxy`).
2. Заполните окружение:
   ```bash
   cp .env.example .env
   # заполните APP_KEY, DB_PASSWORD, REDIS_PASSWORD, REVERB_*, TYPESENSE_API_KEY,
   # S3_ACCESS_KEY_ID и S3_SECRET_ACCESS_KEY
   ```
   `APP_KEY` сгенерируйте: `docker run --rm ${CHAT_API_IMAGE} php artisan key:generate --show`.
3. Настройте proxy: скопируйте `infra/docker/proxy/Caddyfile.example`, замените домен.
4. Запустите стек:
   ```bash
   docker compose --env-file .env -f compose.prod.yaml up -d
   ```
   Объектное хранилище поднимается вместе со стеком: оно обязательно
   (ADR-011). Своё S3-совместимое хранилище вместо встроенного —
   через `S3_ENDPOINT` в `.env`; встроенный сервис тогда простаивает.
5. Примените миграции (однократно, с бэкапом — см. upgrade.md):
   ```bash
   docker compose -p chat exec api php artisan migrate --force
   ```
6. Проверьте готовность:
   - liveness: `curl https://<домен>/up`
   - readiness: `curl https://<домен>/api/v1/readiness` — среди компонентов
     должен быть `storage: ok`;
   - хранилище на запись: `./tools/chat smoke storage` (пишет пробный объект,
     читает обратно и убирает за собой).

Бакет создаётся при первом запуске сам. Если хранилище в этот момент было
недоступно, создайте бакет позже той же идемпотентной командой:
`docker compose -p chat exec api php artisan storage:ensure-bucket`.

## Linux/VM без Docker

Поддерживаемый вторичный профиль: процессы `octane:start`, `horizon`,
`schedule:work`, `reverb:start` под Supervisor — см. [supervisor.md](supervisor.md).
