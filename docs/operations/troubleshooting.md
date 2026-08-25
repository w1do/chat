# Troubleshooting

Статус: in progress

## Диагностика

```bash
docker compose -p chat ps                  # статусы и health
docker compose -p chat logs -f api         # логи компонента
curl -s https://<домен>/api/v1/readiness   # какой компонент degraded
```

## Типовые проблемы

- **`readiness` → `database: fail`** — проверьте `DB_*` в `.env` и health
  контейнера postgres.
- **`queue: fail (horizon is not running)`** — упал worker-контейнер:
  `docker compose -p chat logs worker`.
- **`websocket: fail`** — Reverb не слушает порт; проверьте `REVERB_APP_*`
  и `docker compose -p chat logs reverb`.
- **SPA не подключается к WebSocket** — проверьте `REVERB_PUBLIC_*` и
  `REVERB_ALLOWED_ORIGINS` (wildcard запрещён), а также проксирование
  `/app/*` в конфиге proxy.
- **После deploy исполняется старый код** — выполните `./tools/chat deploy reload`
  (octane:reload + horizon:terminate + reverb:restart).

## Сборка падает на `No releases available for package "pecl.php.net/redis"`

Сервер не смог скачать расширение phpredis с pecl.php.net — обычно это
блокировка или недоступность реестра, а не ошибка сборки.

Сборка это переживает: расширение необязательно, и образ соберётся без него.
Приложение само выберет клиента — `phpredis`, если расширение собралось,
иначе `predis` (чистый PHP, немного медленнее, функционально эквивалентен).
Проверить, что выбрано:

```bash
docker compose exec api php artisan tinker --execute='echo config("database.redis.client");'
```

Клиента можно задать явно переменной `REDIS_CLIENT=predis` или
`REDIS_CLIENT=phpredis`.

Если сборка всё же падает на этом шаге, значит используется старый образ —
обновите репозиторий (`git pull`) и пересоберите с `--build`.

## Dokploy: `lstat /etc/dokploy/compose/<app>/code/infra: no such file or directory`

Собирать не из чего: в рабочем каталоге Dokploy лежит только compose-файл, а
исходников репозитория нет. Так бывает, когда сервис создан в режиме **Raw**
(содержимое compose вставлено руками) или Git-источник не привязан.

Проверьте в настройках сервиса:

- **Provider** — Git/GitHub, репозиторий `w1do/chat`, ветка `main`;
- **Compose Path** — `./docker-compose.yml`;
- после изменения нажмите **Reload**, затем **Deploy**: Dokploy кэширует клон
  и без перечитывания источника продолжит собирать из пустого каталога.

## `Bind for 0.0.0.0:80 failed: port is already allocated`

Порт занят другим процессом — почти всегда балансировщиком самой панели
(Traefik у Dokploy, nginx у другого хостинга).

Основной `docker-compose.yml` портов не публикует: за панелью это и не нужно —
домен направляется на сервис `web`, порт `8080`. Публикацию добавляет только
оверлей `docker-compose.standalone.yml`, предназначенный для голого VPS. Если
ошибка появилась под панелью, значит в команде остался этот оверлей — уберите
его.

На собственном сервере, где 80-й занят чем-то другим, задайте иной порт:
`HTTP_PORT=8080` в `.env`.
