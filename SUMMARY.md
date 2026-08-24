# SUMMARY — текущее состояние проекта

Честное состояние на 2026-08-24. Статусы: `planned` / `in progress` /
`implemented` / `verified`. Статус `implemented` ставится только при наличии
кода и тестов в репозитории.

## Что сделано

Этап 1 roadmap (`openspec/changes/rebuild-chat-by-structure`): каркас
монорепозитория выровнен по `STRUCTURE.md` — composition roots `apps/chat-api`
(Laravel 13, Pest) и `apps/chat-web` (React 19, Vite, TypeScript strict),
скелеты шести backend-пакетов и шести frontend-пакетов, `packages/contracts`
с JSON Schema шести real-time событий, CLI `./tools/chat`, каркас `infra/`
и `docs/`, корневые composer/pnpm workspace с агрегирующими проверками.

## Интерфейс

Продуктовый UI — мобильный: вкладки «Чаты»/«Настройки», лента с группировкой
по автору, ответы, реакции, упоминания, индикатор набора и состояние
соединения, светлая/тёмная тема. Детали и соответствие домену —
[docs/features/mobile-ui.md](docs/features/mobile-ui.md).

## Модули

| Модуль | Что сделано | Статус |
|---|---|---|
| platform/monorepo-foundation | Каркас монорепозитория: apps, packages, contracts, tools/chat, boundary-check; app-тесты и typecheck проходят | in progress |
| operations/self-hosted-runtime | ADR-007/009; compose prod/dev (`compose config` ок); образы api (FrankenPHP+Octane+Horizon+Reverb) и web собираются (`build images` ок); Supervisor-конфиги (`supervisor check` ок); readiness `/api/v1/readiness` + `/up`; `smoke runtime` против dev-стека — все компоненты ok; graceful reload (octane/horizon/reverb) проверен в контейнерах | implemented |
| contracts/api-and-realtime | Единый error envelope + `X-Trace-Id` (9 feature-тестов: validation/401/403/404/409/429/500); сборка OpenAPI из фрагментов пакетов в коммитящийся `dist/openapi.json` (`openapi validate` ок); генерация `api-client` из dist (`client generate` + typecheck ок) с обёрткой 401/419/429; финальные JSON Schema 6 событий + `RealtimeSchemaTest` (8 тестов) | implemented |
| identity/authentication-and-profile | Вход по логину без почты (почта и пароль — в настройках), полный срез регистрации/входа/выхода/восстановления/профиля (19 package-тестов), Sanctum SPA (ADR-005) c CORS/CSRF/rate-limit интеграционными тестами (8), Octane leak-тесты + `smoke octane` под FrankenPHP, OpenAPI+client, формы на дизайн-системе и guard'ы во frontend (13 компонентных тестов) | implemented |
| chat/rooms-and-messages | Полный срез: комнаты/членство (матрица ролей, единственный owner в БД) + сообщения/ответы/реакции/упоминания (санитизация, cursor-пагинация, окно редактирования, soft delete с ответами, идемпотентная отправка, unread-счётчики). 18 package-тестов, 18 feature-тестов, 18 компонентных; OpenAPI 15 путей + клиент; UI: история, композер с reply/mentions, реакции с optimistic rollback | implemented |
| chat/realtime-presence | Системные записи о членстве в истории, конфетти-приветствие, уведомления о входящих (бейджи, заголовок вкладки, тост, Notification API). Broadcast после commit (6 событий, payload по схемам contracts), авторизация приватных/presence/user каналов, Redis presence-реестр с TTL, typing endpoint; фронт: EchoAdapter, `useRealtimeRoom` с HTTP-ресинком после reconnect, TypingIndicator/PresenceDots. Проверено: 7 integration + 4 Redis + 9 contract тестов, 22 компонентных, `smoke websocket` и E2E двух пользователей | verified |
| notifications/offline-delivery | Уведомления тем, кого нет в комнате (presence-реестр как источник истины), категории и каналы с предпочтениями, группировка шумных событий, идемпотентные очереди с retry/backoff/failed и дайджест; лента, счётчик и настройки в интерфейсе. 19 package-тестов, 5 интеграционных, 7 компонентных | implemented |
| search/message-search | Поиск по комнатам пользователя: индекс Typesense с безопасными полями, идемпотентная синхронизация после commit, права проверяются по PostgreSQL, документированная деградация 503, команда `chat:search-reindex`; лист поиска в шапке комнаты. Выключен по умолчанию. 11 package-тестов, 5 feature, 5 компонентных, `smoke search` против настоящего Typesense | implemented |
| ai/text-revisions | Помощник за контрактом `TextRevisionProvider`: Polza (OpenAI-совместимый), Null и Fake; квоты, таймаут, повтор, circuit breaker; endpoint `/ai/message-revisions`; аудит без промптов и ответов; лист помощника в композере (принять/отклонить/отменить/вернуть). 20 package-тестов, 4 интеграционных, 6 компонентных | implemented |
| administration/system-controls | Права `administration.*` и роль `super-admin` (spatie/laravel-permission без teams, ADR-010), `/admin/status`, выключатель AI в `system_settings` с применением на каждый запрос, журнал `audit_logs` с редактированием секретов и приватного текста, аудит AI-обращений, Horizon за gate; экран `/admin` в SPA. 12 package-тестов, 8 интеграционных, 4 компонентных | implemented |

## Ограничения текущего состояния

- Endpoints, миграции доменов, real-time доставка и UI-функции отсутствуют —
  только каркас и контрактные заготовки.
- Изолированные testbench-тесты пакетов (кроме `shared-kernel`) требуют
  установки `orchestra/testbench` (недоступна в offline-окружении разработки
  на момент этапа 1).
- Docker/Compose/Supervisor и CI-workflows появятся на этапах 2 и 12.
