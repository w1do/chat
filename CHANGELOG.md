# Changelog

Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/);
версионирование — [SemVer](https://semver.org/lang/ru/).

## [Unreleased]

### Added

- Развёртывание одной командой: корневой `docker-compose.yml`, рассчитанный в
  том числе на Dokploy (домен → сервис `proxy`, порт 80). Стек сам генерирует
  `APP_KEY` в постоянный том, применяет миграции и создаёт поисковый индекс —
  ручных шагов не осталось; `.env.example` в корне и README для тех, кто
  разворачивает у себя.

- Закалка и готовность к релизу (этап 12 roadmap):
  - `./tools/chat check boundaries` дополнен проверкой сгенерированных файлов
    (OpenAPI dist и клиент не расходятся с генерацией);
  - `./tools/chat check docs` не даёт документации обгонять код: статус
    `implemented`/`verified` обязан называть существующую команду проверки, а
    `verified` — ещё и E2E или smoke;
  - `./tools/chat check selftest` подкладывает нарушения во временное дерево и
    требует, чтобы проверки на них падали;
  - `./tools/chat ci` повторяет локально шаги `pull-request.yml`;
  - workflows `pull-request`, `security`, `release`, `deploy-staging`,
    `deploy-production` (подписанные образы, SBOM, checksum, compose-бандл,
    защищённый production-environment с проверкой подписи перед деплоем);
  - E2E `auth`, `messaging`, `ai-revision` и `./tools/chat e2e critical`;
  - `./tools/chat smoke all`; smoke websocket и search больше не привязаны к
    dev-ключам и работают против production-профиля;
  - `docs/security/{threat-model,hardening,disclosure,secret-rotation}.md`,
    `docs/operations/release-checklist.md`, `SECURITY.md`, `SUPPORT.md`.

### Fixed

- Сборка образа падала там, где недоступен pecl.php.net: расширение phpredis
  теперь необязательно, а клиент Redis выбирается по факту его наличия
  (`phpredis`, иначе `predis`). Для аудитории, которая ставит чат из-за
  блокировок, сборка не должна зависеть от доступности стороннего реестра.
- Horizon обрабатывал только очередь `default`: индексация поиска и все
  уведомления в production просто не выполнялись. Очереди разнесены по
  супервизорам (`critical`, `default`, `notifications`+`search`, `bulk`),
  потому что `balance: auto` не гарантирует порядок между очередями одной
  группы.
- Локальный стек `./tools/chat up` не искал по сообщениям: Typesense не
  поднимался, API не получал переменных поиска, а worker слушал только
  очередь `default` — задания индексации в очереди `search` никто не брал.
  Теперь стек поднимает Typesense, включает поиск, создаёт коллекцию при
  старте и обрабатывает очереди поиска и уведомлений.
- Healthcheck Typesense всегда падал: он использует `/dev/tcp`, который
  понимает только bash, а запускался через `sh`. Контейнер числился
  unhealthy, будучи исправным.
- Настройки: шапки закрытых листов выглядывали из-под нижнего края экрана —
  слой листа теперь обрезает содержимое, а полностью убранный лист скрыт.
- Настройки: браузер предлагал ввести пароль при сохранении почты. Лист
  (`Sheet`) рендерил содержимое даже закрытым, поэтому на экране настроек
  постоянно висела форма смены пароля — её видел менеджер паролей, а до её
  полей доходила табуляция. Теперь содержимое живёт только у открытого листа.

- Production-профиль Compose (найдено финальным гейтом при реальном
  `docker compose up -d`):
  - healthcheck Redis не мог аутентифицироваться — пароль не передавался
    внутрь контейнера;
  - API не получал `DB_CONNECTION`, из-за чего readiness показывал базу
    недоступной на чистой установке;
  - readiness не знал адрес Reverb (`REVERB_SERVER_HOST`/`PORT`) и считал
    WebSocket неработающим.

### Added

- Администрирование и аудит (этап 11 roadmap):
  - пакет `vendor/administration`: таблицы `audit_logs` и `system_settings`,
    контракты `AuditRecorder` и `SystemProbe`, права
    `administration.{system.view,settings.update,audit.view}`, endpoints
    `/admin/status`, `/admin/settings` и `/admin/audit-logs`;
  - `spatie/laravel-permission` без teams-режима (ADR-010): роль `super-admin`
    через `Gate::before`, отдельное право можно выдать и без роли, guard прав
    зафиксирован; первый администратор — `php artisan chat:grant-admin <логин>`;
  - выключатель AI хранится в `system_settings` и применяется к каждому
    запросу: помощник отвечает 503, переписка продолжает работать;
  - журнал пишет административные изменения и AI-обращения (событие
    `RevisionRecorded` из пакета `ai`); из контекста вычищаются секреты и
    приватный текст, числа и флаги остаются;
  - Horizon dashboard закрыт gate `viewHorizon`;
  - экран `/admin` в SPA (состояние, переключатель AI, журнал с фильтром) и
    пункт в настройках, видимый только администратору;
  - `docs/features/administration.md`, `docs/decisions/ADR-010-permissions-without-teams.md`.

### Added

- Поиск по сообщениям (этап 9 roadmap):
  - индекс Typesense за контрактом `MessageIndex` (адаптеры `typesense`/`null`
    и `FakeMessageIndex` для тестов); в документе только безопасные поля —
    `id`, `room_id`, `author_id`, `body`, `created_at`;
  - `SearchConfig` проверяет конфигурацию на старте: при включённом поиске
    пустой обязательный параметр — ошибка с именем ключа, без значения;
  - `SyncMessageIndexJob` после commit приводит документ к состоянию строки в
    PostgreSQL, поэтому правка, мягкое удаление, повтор и любой порядок
    заданий идемпотентны, а откат в индекс не попадает;
  - `GET /api/v1/search/messages`: результаты только из комнат пользователя,
    тела читаются из PostgreSQL, удалённые и системные записи не выдаются;
    недоступный индекс — `503 service_unavailable`, чат продолжает работать;
  - команда `chat:search-reindex [--fresh] [--chunk=]` перестраивает индекс
    из PostgreSQL;
  - лист поиска в шапке комнаты с состояниями «ищем», «ничего не нашлось»,
    «поиск недоступен» и «сообщение вне загруженной истории»;
  - `./tools/chat smoke search` против настоящего Typesense;
  - `docs/features/message-search.md`, `docs/operations/search-reindex.md`.

### Added

- Уведомления о пропущенном (этап 8 roadmap):
  - пакет `vendor/notifications`: таблицы `notifications` и
    `notification_preferences`, категории (message/mention/room_invite/security)
    и каналы (лента/почта), `PreferenceResolver` поверх значений по умолчанию,
    контракт `ActivityInspector`;
  - правило «не уведомлять того, кто в комнате»: активность берётся из
    presence-реестра chat, связка — в `PackageWiringProvider`; инициатор не
    уведомляется никогда;
  - группировка шумных событий в одну запись со счётчиком внутри окна;
  - очереди по категориям, идемпотентный `DeliverNotificationJob`
    (уникальный ключ, tries/backoff/timeout/failed) и `SendDigestJob`;
    провал письма не мешает сохранению сообщения;
  - endpoints `/notifications`, `/notifications/read`,
    `/notification-preferences` + OpenAPI и клиент;
  - пакет `@vendor/notifications`: лента с категориями и счётчиком свёрнутых
    событий, отметка прочитанного, настройки каналов; экран «Уведомления» и
    колокольчик с бейджем в списке чатов;
  - `docs/features/notifications.md`.

### Added

- AI-помощник для черновиков (этап 10 roadmap):
  - пакет `vendor/ai`: порт `TextRevisionProvider`, реализации Polza
    (OpenAI-совместимый `/chat/completions`), Null и Fake; VO `DraftText`,
    `RevisionResult`, `TokenUsage`; модель и миграция `ai_requests`;
  - `ReviseDraftHandler` с проверкой выключателя, квотами на пользователя,
    лимитом длины до вызова поставщика, таймаутом, одним повтором для сетевого
    сбоя и circuit breaker;
  - `POST /api/v1/ai/message-revisions` (fix/clarify/shorten/expand/tone/custom),
    503 при выключенном помощнике или отказе поставщика, 429 при квоте;
  - аудит без приватного содержимого: операция, модель, статус, токены,
    стоимость в минимальных единицах, длина ввода, длительность;
  - фронтенд: `useRevision` с отменой ожидания и лист помощника — предложение
    рядом с исходником, замена только по явному действию, «вернуть мой текст»,
    честная ошибка, не мешающая отправке;
  - `./tools/chat smoke polza` (опционально, по `AI_API_KEY`), параметры AI
    в `infra/compose/.env.example`;
  - ADR-006, `docs/features/ai-text-revision.md`, раздел в threat model.

### Added

- Живой чат: ответы, эмодзи, системные события и уведомления (этап 14 roadmap):
  - `messages.kind` и `payload` (forward-миграция): вступление, приглашение и
    выход пишутся системными записями в общую ленту той же транзакцией, что и
    членство, и уходят через `message.created.v1`; редактирование, удаление и
    реакции для них запрещены политикой;
  - ответы как в мессенджерах: действие на самом сообщении, цитата над
    композером с отменой, клик по цитате переносит к оригиналу и подсвечивает
    его; удалённый оригинал так и написан;
  - палитра эмодзи для реакций и вставка эмодзи в черновик по каретке;
  - приветствие нового участника: конфетти на весь экран и центральная надпись,
    гаснет сама, не перехватывает нажатия, уважает `prefers-reduced-motion`;
  - уведомления о входящих: бейджи, счётчик в заголовке вкладки, тост и — по
    явному разрешению для фоновой вкладки — системное уведомление, открывающее
    комнату; для своих сообщений и активной комнаты тишина;
  - схема `Message` и событие `message.created.v1` дополнены `kind`/`payload`,
    добавлена фикстура системного события.

### Changed

- Вход стал коротким: логин и пароль, без почты (этап 13 roadmap):
  - forward-миграция `users.username` (уникален) и `users.email` → nullable;
    существующим аккаунтам логин выведен из локальной части адреса;
  - регистрация/вход принимают `login`; ответ на неверные данные одинаков для
    существующего и несуществующего логина; rate limiter ключуется логином+IP;
  - почта и пароль меняются в настройках: `PATCH /me/email`,
    `PATCH /me/password` (с подтверждением текущего пароля и сбросом
    remember-токена); восстановление пароля работает только при сохранённой
    почте и честно объясняет это в интерфейсе;
  - формы входа, регистрации, восстановления, профиля, почты и пароля
    переписаны на примитивах `@vendor/ui`; со страницы входа убран инлайновый
    CSS, отдельная страница профиля заменена листами в настройках;
  - OpenAPI и клиент пересобраны; ADR-005 дополнен ревизией.

### Added

- Мобильный интерфейс из прототипа `chat/`, связанный с реальным API:
  - `@vendor/ui`: токены светлой/тёмной темы, анимации и safe-area,
    примитивы (Avatar, Dots, Toggle, Segmented, Sheet, Row, Group, Toast),
    хуки клавиатурных вставок, высоты элемента и темы; 4 теста;
  - `@vendor/chat`: экраны `RoomsScreen`, `ChatScreen` (группировка по автору,
    дни, ответы, реакции, упоминания, набор текста, баннер соединения,
    вступление в комнату) и `MagicSheet` (помощник; активен только при
    `ai.enabled`); 22 теста — прежние desktop-компоненты заменены;
  - `apps/chat-web`: оболочка со вкладками, экран настроек (тема, размер
    текста, анимации, «печатает», Enter отправляет — хранятся локально),
    экран участников, оформление форм входа; Tailwind CSS подключён;
  - API ради интерфейса: `unread_count` в `GET /rooms` и
    `POST /rooms/{room}/read` (отметка прочтения, не двигается назад);
  - адрес WebSocket по умолчанию берётся из origin страницы — SPA работает
    и на `localhost:8088`, и за доменом без пересборки образа;
  - `docs/features/mobile-ui.md`.
- Real-time, присутствие, набор текста (этап 7 roadmap):
  - broadcast-классы `*V1` с конвертом контрактов и `ShouldDispatchAfterCommit`,
    мост доменных событий, события членства и typing;
  - авторизация каналов в `routes/channels.php` (room/presence/user), маршрут
    `/broadcasting/auth` через session-стек;
  - `PresenceRegistry` + `RedisPresenceRegistry` (TTL, очистка просроченных),
    `SetTyping` команда и endpoint `POST /rooms/{room}/typing`;
  - контрактный тест реальных broadcast-payload'ов против JSON Schema;
  - фронтенд: `eventMap`/`handlers`, `EchoAdapter`, `useRealtimeRoom`
    (подписка только для участников, HTTP-ресинк после reconnect), `useTyping`,
    `TypingIndicator`, `PresenceDots`, `ConnectionBanner`;
  - CSRF-handshake и `X-XSRF-TOKEN` в `@vendor/api-client` и Echo-auth;
  - оптимистичное сообщение заменяется серверным (без дублей с WS-событием),
    безопасный фолбэк ключа идемпотентности вне secure context;
  - `./tools/chat up|down` (локальный стек), `e2e <spec>`, `smoke websocket`;
    Playwright-сценарий `e2e/realtime.spec.ts` (два пользователя, typing,
    reconnect/resync) проходит против полного стека;
  - ADR-003, `docs/features/presence-typing.md`, обновлён `docs/api/realtime-events.md`.
- Сообщения, ответы, реакции, упоминания (этап 6 roadmap):
  - миграции `messages` (self-FK ответов с restrict, soft delete, индекс
    (room_id,id) под ULID-курсор) и `message_reactions` (уникальность
    message+user+emoji), forward-миграция `last_read_message_id`;
  - VO MessageBody/MentionList/MessageCursor, контракт MessageSanitizer,
    MessagePolicy (окно редактирования 15 мин, delete автором/модератором);
  - команды SendMessage (идемпотентность по Idempotency-Key, reply в той же
    комнате), EditMessage/DeleteMessage (row-lock), ToggleReaction,
    MarkRoomRead (монотонная отметка) и запросы ListMessages (cursor),
    GetMessage, GetUnreadCounters; доменные события для этапа 7;
  - V1 endpoints `/rooms/{room}/messages`, `/messages/{message}`,
    `/messages/{message}/reactions`;
  - OpenAPI-фрагменты + регенерированный клиент;
  - `@vendor/chat`: MessageList/MessageItem/MessageComposer/ReplyPreview/
    ReactionBar/MentionPicker, хуки с optimistic updates и rollback,
    безопасный текстовый рендер; сообщения в `ChatPage`;
  - ADR-004 (лёгкий CQRS), `docs/features/{messaging,replies,reactions,mentions}.md`.
- Комнаты и членство (этап 5 roadmap):
  - пакет `vendor/chat`: миграции `rooms`/`room_members` (ULID, частичный
    уникальный индекс «один owner на комнату»), rich-модели Room/RoomMember,
    enums, RoomPolicy/MembershipPolicy, команды CreateRoom/UpdateRoom/
    ArchiveRoom/InviteMember/JoinRoom/LeaveRoom/ChangeMemberRole и запросы
    ListRooms/GetRoom/ListMembers с DTO;
  - V1 endpoints `/rooms`, `/rooms/{room}`, `/rooms/{room}/members*` со
    scoped bindings, авторизацией политиками и 409 при повторном членстве;
  - OpenAPI-фрагменты rooms/members → dist → регенерированный клиент;
  - `@vendor/chat`: Zod-схемы, `useRooms`/`useMembers`/`useMembershipActions`,
    `RoomList`/`RoomHeader`/`CreateRoomForm`/`MembershipManager`;
    `ChatPage` и `RoomSettingsPage` в `chat-web`;
  - `docs/features/{rooms,membership}.md`.
- Identity (этап 4 roadmap):
  - пакет `vendor/identity`: миграции (users ULID, password_reset_tokens,
    personal_access_tokens), базовая модель User (наследуется приложением через
    `config('identity.user_model')`), commands/handlers Register/Login/Logout/
    RequestPasswordReset/ResetPassword/UpdateProfile/GetMe, V1 контроллеры и
    маршруты `/auth/*`, `/me`, rate limiters;
  - Sanctum cookie SPA auth (ADR-005): stateful api, CSRF, CORS allowlist,
    trusted proxies; интеграционные тесты (login, invalid, rate limit, CSRF,
    CORS deny);
  - `tests/Octane/WorkerStateLeakTest` + `./tools/chat smoke octane` —
    проверка отсутствия утечки identity в одном FrankenPHP worker'е;
  - OpenAPI-фрагменты identity → dist → регенерированный api-client;
  - пакет `@vendor/identity`: Zod-схемы, `useAuth`, формы Login/Register/
    Recovery/Profile (vitest+Testing Library, 9 тестов), страницы и route
    guards в `chat-web`;
  - `./tools/chat test <module>` и `./tools/chat web test <package>`.
- Контракты API и real-time (этап 3 roadmap):
  - единый JSON error envelope (`code`, `message`, `details`, `trace_id`) для
    всех ошибок API + заголовок `X-Trace-Id`; feature-тесты на все классы ошибок;
  - сборка OpenAPI 3.1 из фрагментов пакетов (`openapi/build.php`) в
    коммитящийся `openapi/dist/openapi.json`; `./tools/chat openapi build|validate`;
  - генерация TypeScript-типов клиента из dist (`openapi-typescript`) и обёртка
    `@vendor/api-client` (envelope, trace_id, 401/419/429, Idempotency-Key);
    `./tools/chat client generate`;
  - финальные JSON Schema шести real-time событий (draft 2020-12,
    `additionalProperties: false`) + контрактный тест с фикстурами;
  - `docs/api/{rest-guidelines,error-envelope,realtime-events,versioning}.md`,
    ADR-008 (OpenAPI как источник истины);
  - подключён `@tanstack/react-query` в `chat-web` (QueryClient в провайдерах).
- Self-hosted runtime (этап 2 roadmap):
  - ADR-007 (Docker Compose как способ поставки) и ADR-009 (FrankenPHP как
    Octane application server);
  - `infra/compose/{compose.prod.yaml,compose.dev.yaml,compose.override.example.yaml}`
    с закреплёнными образами, health checks и одним процессом на контейнер;
  - multi-stage non-root образы `infra/docker/{api,web}/Dockerfile`, примеры
    reverse proxy `infra/docker/proxy/`;
  - Supervisor-конфиги `infra/supervisor/*` для Linux/VM-профиля;
  - liveness `/up` и readiness `/api/v1/readiness` (database, redis, queue,
    websocket, search — без секретов) со smoke-тестами;
  - команды `./tools/chat compose config | build images | supervisor check |
    deploy reload | smoke runtime`;
  - документация `docs/operations/{installation,configuration,supervisor,backup-restore,upgrade,troubleshooting}.md`.
- Каркас монорепозитория, выровненный по `STRUCTURE.md` (этап 1 roadmap
  `rebuild-chat-by-structure`):
  - `apps/chat-api` — Laravel 13 composition root: провайдеры
    (`PackageWiringProvider`, `BroadcastServiceProvider`), `app/Support/{ApiErrorEnvelope,TraceId}`,
    маршруты `api/channels/console`, каркас OpenAPI (`openapi.base.yaml`, `build.php`),
    тестовые сьюты `Integration/Contract/Smoke/Octane` (Pest);
  - `apps/chat-web` — React 19 composition root: `src/app/{providers,router,runtime-config,echo,query-client,permissions}`,
    страницы-заглушки, `public/config.template.json`, Playwright-плейсхолдеры `e2e/`;
  - скелеты backend-пакетов `shared-kernel` (идентификаторы, контракты, value objects),
    `identity`, `chat`, `notifications`, `ai`, `administration` (composer, ServiceProvider,
    config, testbench TestCase);
  - `packages/contracts` — JSON Schema шести версионированных real-time событий;
  - скелеты frontend-пакетов `tooling`, `ui`, `api-client`, `chat`, `identity`, `notifications`;
  - CLI `./tools/chat` (api, web, test, check boundaries, contracts validate, lint, stan);
  - корневые `composer.json` (path repositories, aggregate-скрипты), pnpm workspace,
    `pint.json`, `phpstan.neon`, каркас `infra/` и `docs/` со статусами `planned`.
