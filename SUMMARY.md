# SUMMARY — текущее состояние проекта

Честное состояние на 2026-08-25. Статусы: `planned` / `in progress` /
`implemented` / `verified`. Статус `implemented` ставится только при наличии
кода и тестов в репозитории.

## Что сделано

Roadmap `openspec/changes/rebuild-chat-by-structure` пройден полностью
(этапы 1–14). Продукт собирается из пакетов: composition roots `apps/chat-api`
(Laravel 13, Octane/FrankenPHP, Pest) и `apps/chat-web` (React 19, Vite,
TypeScript strict), шесть backend-пакетов и шесть frontend-пакетов,
`packages/contracts` с JSON Schema real-time событий, CLI `./tools/chat`,
`infra/` (Docker, Compose, Supervisor), документация и ADR-001…010.

Полный локальный прогон CI — `./tools/chat ci`; критические сценарии —
`./tools/chat e2e critical`; готовность развёрнутого стека — `./tools/chat
smoke all`.

## Интерфейс

Продуктовый UI — мобильный: вкладки «Чаты»/«Настройки», лента с группировкой
по автору, ответы, реакции, упоминания, индикатор набора и состояние
соединения, светлая/тёмная тема. Детали и соответствие домену —
[docs/features/mobile-ui.md](docs/features/mobile-ui.md).

## Модули

| Модуль | Что сделано | Статус |
|---|---|---|
| platform/monorepo-foundation | Каркас монорепозитория и границы пакетов: `check boundaries` ловит cross-package internals, deep imports, расхождение сгенерированных файлов и `Domain/` в apps, `check docs` — статусы документации, `check selftest` доказывает, что обе проверки падают на подложенном нарушении; workflows pull-request/security/release/deploy-*; `./tools/chat ci` повторяет их локально | verified |
| operations/self-hosted-runtime | Финальный гейт: production-профиль поднят `docker compose up -d`, миграции применены, `smoke all` (runtime + websocket + search) зелёный; ADR-007/009; compose prod/dev (`compose config` ок); образы api (FrankenPHP+Octane+Horizon+Reverb) и web собираются (`build images` ок); Supervisor-конфиги (`supervisor check` ок); readiness `/api/v1/readiness` + `/up`; `smoke runtime` против dev-стека — все компоненты ok; graceful reload (octane/horizon/reverb) проверен в контейнерах | verified |
| contracts/api-and-realtime | Единый error envelope + `X-Trace-Id` (9 feature-тестов: validation/401/403/404/409/429/500); сборка OpenAPI из фрагментов пакетов в коммитящийся `dist/openapi.json` (`openapi validate` ок); генерация `api-client` из dist (`client generate` + typecheck ок) с обёрткой 401/419/429; финальные JSON Schema 6 событий + `RealtimeSchemaTest` (8 тестов) | implemented |
| identity/authentication-and-profile | E2E `e2e auth`; вход по логину без почты (почта и пароль — в настройках), полный срез регистрации/входа/выхода/восстановления/профиля (19 package-тестов), Sanctum SPA (ADR-005) c CORS/CSRF/rate-limit интеграционными тестами (8), Octane leak-тесты + `smoke octane` под FrankenPHP, OpenAPI+client, формы на дизайн-системе и guard'ы во frontend (13 компонентных тестов) | verified |
| chat/message-interaction | Действия над сообщением жестами: свайп влево — ответ, двойное касание — `❤️`, долгое нажатие и правый клик — меню (палитра, ответить, копировать, удалить); всё дублируется клавиатурой. Постоянных кнопок в ленте нет. 62 компонентных теста пакета chat | implemented |
| chat/visual-language | Лента по макету (аватар и имя с обеих сторон, разделитель дня), «печатает» в шапке со сворачиванием, экран приложения заякорен к `visualViewport` (клавиатура на iOS не уводит экран), центрированные формы входа | implemented |
| chat/rooms-and-messages | Полный срез: комнаты/членство (матрица ролей, единственный owner в БД) + сообщения/ответы/реакции/упоминания (санитизация, cursor-пагинация, окно редактирования, soft delete с ответами, идемпотентная отправка, unread-счётчики). 18 package-тестов, 18 feature-тестов, 18 компонентных; OpenAPI 15 путей + клиент; UI: история, композер с reply/mentions, реакции с optimistic rollback; E2E `e2e messaging` | verified |
| chat/realtime-presence | Системные записи о членстве в истории, конфетти-приветствие, уведомления о входящих (бейджи, заголовок вкладки, тост, Notification API). Broadcast после commit (6 событий, payload по схемам contracts), авторизация приватных/presence/user каналов, Redis presence-реестр с TTL, typing endpoint; фронт: EchoAdapter, `useRealtimeRoom` с HTTP-ресинком после reconnect, TypingIndicator/PresenceDots. Проверено: 7 integration + 4 Redis + 9 contract тестов, 22 компонентных, `smoke websocket` и E2E двух пользователей | verified |
| notifications/offline-delivery | Уведомления тем, кого нет в комнате (presence-реестр как источник истины), категории и каналы с предпочтениями, группировка шумных событий, идемпотентные очереди с retry/backoff/failed и дайджест; лента, счётчик и настройки в интерфейсе. 19 package-тестов, 5 интеграционных, 7 компонентных, E2E `e2e messaging` (пропущенное сообщение доходит до ленты) | verified |
| search/message-search | Поиск по комнатам пользователя: индекс Typesense с безопасными полями, идемпотентная синхронизация после commit, права проверяются по PostgreSQL, документированная деградация 503, команда `chat:search-reindex`; лист поиска в шапке комнаты. Выключен по умолчанию. 11 package-тестов, 5 feature, 5 компонентных, `smoke search` против настоящего Typesense | verified |
| ai/text-revisions | Помощник за контрактом `TextRevisionProvider`: Polza (OpenAI-совместимый), Null и Fake; квоты, таймаут, повтор, circuit breaker; endpoint `/ai/message-revisions`; аудит без промптов и ответов; лист помощника в композере (принять/отклонить/отменить/вернуть). 20 package-тестов, 4 интеграционных, 6 компонентных, E2E `e2e ai-revision` | verified |
| administration/system-controls | Права `administration.*` и роль `super-admin` (spatie/laravel-permission без teams, ADR-010), `/admin/status`, выключатель AI в `system_settings` с применением на каждый запрос, журнал `audit_logs` с редактированием секретов и приватного текста, аудит AI-обращений, Horizon за gate; экран `/admin` в SPA. 12 package-тестов, 8 интеграционных, 4 компонентных | implemented |

## Ограничения текущего состояния

- Сквозного шифрования нет: администратор сервера технически может прочитать
  переписку. Это заявленная граница MVP (`docs/security/threat-model.md`).
- Поиск и AI-помощник выключены по умолчанию; включение описано в
  `docs/operations/search-reindex.md` и `docs/features/ai-text-revision.md`.
- Workflows написаны, но на GitHub Actions ещё не выполнялись: локально их
  шаги повторяет `./tools/chat ci` (он зелёный), а деплой-workflows требуют
  секретов и хостов конкретной установки.
- E2E-сценарий помощника проверяет выключенный путь; путь с настоящим
  провайдером включается `E2E_AI_ENABLED=true` и ключом поставщика.
- Аудио- и видеозвонки, федерация и маркетплейс расширений не входят в MVP.
