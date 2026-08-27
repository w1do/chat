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
- **«Сессия истекла» появляется слишком часто** — интерфейс показывает этот
  экран на первый 401 после состоявшегося входа. Проверьте время жизни сессии
  (`SESSION_LIFETIME`), совпадение домена в `SESSION_DOMAIN`/`APP_URL` и
  `SANCTUM_STATEFUL_DOMAINS`, а также что reverse proxy передаёт cookie. Если
  вход обрывается после долгого простоя вкладки, помогает
  `AUTH_SILENT_RECOVERY=true`: клиент один раз обновит CSRF-cookie и проверит
  `/me` прежде, чем показать экран.
- **Экран «Сессия истекла» не уходит после входа** — «Войти снова» уводит на
  `/login` полной перезагрузкой страницы. Если этого не происходит, смотрите
  ответ `POST /api/v1/auth/logout`: 419 означает, что до контейнера не доходит
  заголовок `X-XSRF-TOKEN` (проверьте проксирование заголовков).

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

## Домен отвечает `404 not found`

Так отвечает балансировщик панели, когда не находит контейнер за доменом.
Приложение при этом обычно работает — проверьте изнутри:

```bash
docker compose exec web wget -qO- http://localhost:8080/config.json
```

Если ответ есть, дело в маршрутизации. Разберитесь по шагам:

**Шаг 0. Проверьте, что контейнер приложения `healthy`.**

```bash
docker ps --format '{{.Names}} | {{.Status}}' | grep web
```

Traefik не маршрутизирует на контейнеры с проваленным healthcheck: он молча их
пропускает. Домен при этом отвечает 404, метки выглядят правильными, а в логах
балансировщика пусто — уровень логирования по умолчанию показывает только
ошибки. Если статус `unhealthy`, смотрите причину:

```bash
docker inspect $(docker ps -qf name=web | head -1) --format '{{json .State.Health}}'
```

**Шаг 1. Нет ли в панели старой записи домена.** Запись, созданная до того,
как из стека убрали отдельный прокси, ссылается на несуществующий сервис.
Traefik создаёт по ней маршрут с тем же доменом, и запрос уходит в никуда.
Удалите все записи домена в разделе Domains и передеплойте: маршрут объявлен в
`docker-compose.yml`, панели его дублировать не нужно.

**Шаг 2. Какие маршруты видит сам Traefik:**

```bash
docker exec $(docker ps -qf name=traefik | head -1) wget -qO- http://localhost:8080/api/http/routers | tr ',' '\n' | grep -iE 'rule|service|status'
```

**Шаг 3. Если маршрута всё равно нет — задайте его файлом.** Балансировщик
может не читать метки docker-контейнеров (в Dokploy compose-проекты
маршрутизируются файлами: соседние маршруты в `/etc/dokploy/traefik/dynamic/`
помечены `@file`). Готовый шаблон — `infra/traefik/chat.yml.example`:

```bash
docker ps --format '{{.Names}}' | grep web        # имя контейнера приложения
cp infra/traefik/chat.yml.example /etc/dokploy/traefik/dynamic/chat.yml
# подставьте домен и имя контейнера, сохраните — Traefik подхватит сам
```

**Шаг 4. Остальное:

- `APP_DOMAIN` должен совпадать с доменом в панели: из него собирается правило
  `Host(...)` в метках Traefik. Проверить, что реально прописано:
  ```bash
  docker inspect chat-web-1 --format '{{json .Config.Labels}}' | tr ',' '\n' | grep -i traefik
  ```
- домен должен указывать на сервис **`web`**, порт **`8080`** (не на `api`
  и не на 80);
- контейнер `web` должен быть в сети балансировщика. В Dokploy это
  `dokploy-network`; проверить:
  ```bash
  docker inspect chat-web-1 --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'
  ```
  В списке должна быть сеть панели. Контейнер состоит в нескольких сетях,
  поэтому в метках явно указано `traefik.docker.network` — без этого
  балансировщик может пытаться идти во внутреннюю сеть и не достучаться.
  Если у панели сеть называется иначе, задайте `PROXY_NETWORK`.

Если сеть отсутствует, `docker compose up -d` завершится ошибкой
`network dokploy-network declared as external, but could not be found` — это
тот же случай: имя сети не совпадает.
