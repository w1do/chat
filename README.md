# Семейный чат

Свой мессенджер на своём сервере. Для тех, кто устал от блокировок и не хочет,
чтобы переписка семьи жила в чужом облаке: разворачиваете одной командой на
любом VPS — и у вас собственный веб-чат, который работает, пока работает ваш
сервер. Открывается в браузере на телефоне и на компьютере, ставить ничего не
нужно.

Открытый исходный код. Никакой телеметрии, никакого внешнего control plane:
приложение не звонит домой и не зависит ни от одного стороннего сервиса.

## Запуск

### В Dokploy (или за любым Traefik / nginx)

1. **Create Service → Compose**, репозиторий `https://github.com/w1do/chat`,
   ветка `main`, Compose Path — `docker-compose.yml`.
2. **Environment** — заполните по [`.env.example`](.env.example). Минимум:
   ```
   APP_URL=https://chat.вашдомен.ru
   APP_DOMAIN=chat.вашдомен.ru
   SESSION_SECURE_COOKIE=true
   REVERB_ALLOWED_ORIGINS=https://chat.вашдомен.ru
   DB_PASSWORD=…
   REDIS_PASSWORD=…
   REVERB_APP_SECRET=…
   TYPESENSE_API_KEY=…
   ```
3. **Domains** — домен на сервис **`web`**, порт **`8080`**, включите HTTPS.
4. **Deploy**.

Сервис `web` подключается к сети `dokploy-network` и сам объявляет маршрут
Traefik (`Host(APP_DOMAIN)` → порт 8080). Поэтому важно, чтобы `APP_DOMAIN`
совпадал с доменом в панели. Если у вашей панели другая сеть, другой
entrypoint или резолвер сертификатов — задайте `PROXY_NETWORK`,
`TRAEFIK_ENTRYPOINT`, `TRAEFIK_CERTRESOLVER`.

Стек не публикует порты наружу: 80 и 443 остаются у вашей панели, а домен на
контейнер направляет её Traefik. Наружу смотрит единственный сервис `web` — он
отдаёт приложение и проксирует API и WebSocket внутрь, поэтому всё живёт на
одном адресе (этого требует аутентификация по cookie).

`APP_DOMAIN` — то же, что `APP_URL`, но без `https://`. Если он не совпадёт с
адресом в браузере, вход не удержится.

### На своём VPS без панели

```bash
git clone https://github.com/w1do/chat.git && cd chat
docker compose -f docker-compose.yml -f docker-compose.standalone.yml up -d --build
```

Второй файл добавляет публикацию порта (`HTTP_PORT`, по умолчанию 80) — больше
он ни для чего не нужен.

### Первый запуск

Стек сам сгенерирует ключ приложения, применит миграции, создаст поисковый
индекс и поднимет восемь сервисов. Открывайте чат, регистрируйтесь первым и
создавайте комнату.

Первый администратор назначается на сервере:

```bash
docker compose exec api php artisan chat:grant-admin ваш_логин
```

### Если сборка не проходит

- `No releases available for package "pecl.php.net/redis"` — сервер не достучался
  до PECL. Ничего делать не нужно: расширение необязательно, приложение
  переключится на `predis`. Убедитесь только, что собираете актуальную версию
  (`git pull`).
- `lstat .../code/infra: no such file or directory` в Dokploy — сервис создан
  без Git-источника (режим Raw), и собирать не из чего. Укажите Provider →
  Git, репозиторий и ветку `main`, затем Reload и Deploy.
- `Bind for 0.0.0.0:80 failed: port is already allocated` — порт занят панелью.
  Разворачивайте без `docker-compose.standalone.yml`: за Traefik публиковать
  порт не нужно, домен направляется на сервис `web`, порт 8080.
- Домен отвечает `404 not found` — сначала проверьте `docker ps | grep web`:
  балансировщик не маршрутизирует на контейнер с проваленным healthcheck и
  делает это молча. Дальше — ответ самого Traefik:
  маршрут до контейнера не найден. Проверьте, что `APP_DOMAIN` совпадает с
  доменом в панели, а сеть панели называется `dokploy-network` (иначе задайте
  `PROXY_NETWORK`). Если балансировщик не читает метки контейнеров, задайте
  маршрут файлом — шаблон `infra/traefik/chat.yml.example`, подробности в
  [troubleshooting](docs/operations/troubleshooting.md).

Остальные случаи — [docs/operations/troubleshooting.md](docs/operations/troubleshooting.md).

## Что умеет

- **Комнаты** — публичные и приватные, роли `владелец` / `админ` / `участник`,
  приглашения, вступление и выход.
- **Сообщения в реальном времени** — доставка по WebSocket, ответы как в
  Telegram, реакции эмодзи, упоминания `@`, правка и мягкое удаление,
  бесконечная история с курсорной пагинацией.
- **Живое присутствие** — «печатает…», кто в комнате, конфетти при входе нового
  участника, автоматическая синхронизация истории после обрыва связи.
- **Уведомления о пропущенном** — приходят только тому, кого сейчас нет в
  комнате; шумные комнаты сворачиваются в одну запись со счётчиком; каналы
  (лента и почта) настраивает сам пользователь.
- **Поиск по истории** — только по вашим комнатам, мгновенный, на Typesense.
- **AI-помощник** (по желанию) — правит черновик: исправить ошибки, сказать
  понятнее, короче, мягче. Всегда **предлагает**, а не публикует за вас, и
  выключен по умолчанию.
- **Панель администратора** — состояние сервисов, выключатель AI, журнал
  значимых действий.
- **Мобильный интерфейс** — светлая и тёмная тема, размер текста, работа с
  клавиатуры, доступность.

## Чем это лучше

**Работает, пока работает ваш сервер.** Никаких блокировок, лимитов и
«аккаунт ограничен». Свой домен, свои правила, свои данные.

**Переписка остаётся у вас.** PostgreSQL на вашем диске, резервная копия —
обычный `pg_dump`. Никаких третьих сторон: даже AI-помощник по умолчанию
выключен, а включив его, вы сами решаете, какому провайдеру отправлять
черновик — наружу уходит только тот текст, который пользователь попросил
поправить, без истории комнаты.

**Ставится одной командой и обновляется одной командой.** Всё в Docker
Compose: `git pull && docker compose up -d --build`. Нет Kubernetes, нет
микросервисов, нет обязательной внешней инфраструктуры.

**Живой чат, а не форма отправки сообщений.** Сообщения приходят мгновенно,
видно, кто печатает и кто в комнате; после обрыва связи история
досинхронизируется по HTTP, поэтому ничего не теряется.

**Тихие уведомления.** Вас не дёргают о комнате, в которой вы прямо сейчас
сидите, и не присылают десять писем подряд из активной беседы.

**Экономно к ресурсам.** Весь стек живёт на VPS c 2 vCPU и 2 ГБ памяти;
поиск и AI отключаются, если не нужны.

**Честный открытый код.** Тесты, документация и статусы функций в репозитории;
в документации не написано «сделано» там, где это не подтверждено проходящей
командой проверки — за этим следит отдельная CI-проверка.

## Технологии

**Backend**

- PHP 8.4, [Laravel 13](https://laravel.com) — API-only, без Blade и Filament
- [Laravel Octane](https://laravel.com/docs/octane) + FrankenPHP — постоянные
  worker'ы вместо перезапуска на каждый запрос
- [Laravel Reverb](https://reverb.laravel.com) — свой WebSocket-сервер
- [Laravel Horizon](https://laravel.com/docs/horizon) — очереди на Redis
- [Laravel Sanctum](https://laravel.com/docs/sanctum) — cookie-аутентификация SPA
- [spatie/laravel-permission](https://spatie.be/docs/laravel-permission) — роли и права
- PostgreSQL 18, Redis 8, [Typesense 29](https://typesense.org) — поиск
- [Pest](https://pestphp.com), PHPStan (Larastan), Laravel Pint

**Frontend**

- React 19, TypeScript (strict), Vite 5
- TanStack Query — серверное состояние, Zustand — только UI-состояние
- React Hook Form + Zod, Tailwind CSS, lucide-react
- Laravel Echo + pusher-js — real-time
- Vitest, Testing Library, Playwright

**Инфраструктура**

- Docker Compose (восемь сервисов), Supervisor — для установки без Docker
- OpenAPI 3.1 как источник истины: TypeScript-клиент генерируется из схемы
- GitHub Actions: тесты, аудит зависимостей, сканирование секретов и образов,
  подписанные релизы с SBOM

**Архитектура** — package-first монорепозиторий: `apps/*` собирают приложение
из независимых пакетов `packages/backend/*` и `packages/frontend/*`; внутри
пакета — слои Domain / Application / Infrastructure / Presentation и лёгкий
CQRS. Подробности: [STRUCTURE.md](STRUCTURE.md), решения — [docs/decisions](docs/decisions).

## Требования к серверу

| | Минимум | Комфортно |
|---|---|---|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 2 ГБ | 4 ГБ |
| Диск | 10 ГБ | 20 ГБ+ |
| ОС | любая с Docker ≥ 24 | |

## Обслуживание

```bash
docker compose ps                                   # состояние сервисов
curl http://localhost/api/v1/readiness              # готовность зависимостей
docker compose exec api php artisan chat:search-reindex --fresh   # перестроить поиск
docker compose exec postgres pg_dump -U chat chat > backup.sql    # резервная копия
git pull && docker compose up -d --build            # обновление
```

Подробнее: [установка](docs/operations/installation.md),
[резервные копии](docs/operations/backup-restore.md),
[обновление](docs/operations/upgrade.md),
[диагностика](docs/operations/troubleshooting.md),
[поиск](docs/operations/search-reindex.md).

## Безопасность

Обязательный чек-лист для публичного сервера —
[docs/security/hardening.md](docs/security/hardening.md); модель угроз и
границы — [docs/security/threat-model.md](docs/security/threat-model.md).
Об уязвимостях сообщайте по [SECURITY.md](SECURITY.md), не открывая публичный
issue.

Честная граница: сквозного шифрования нет — администратор сервера технически
может прочитать переписку. Для семейного чата на своём сервере это обычно
приемлемо, но знать об этом стоит.

## Разработка

```bash
pnpm install && composer install
./tools/chat up          # локальный стек на http://localhost:8088
./tools/chat ci          # всё, что проверяет CI
./tools/chat e2e critical # критические сценарии в браузере
```

Полный список команд — `./tools/chat` без аргументов. Состояние модулей —
[SUMMARY.md](SUMMARY.md), правила разработки — [CLAUDE.md](CLAUDE.md).

## Разработчик

Telegram: [@W1DO_DIGITAL](https://t.me/W1DO_DIGITAL) — вопросы по установке,
доработкам и внедрению.

## Лицензия

См. [LICENSE](LICENSE). Вопросы поддержки — [SUPPORT.md](SUPPORT.md).
