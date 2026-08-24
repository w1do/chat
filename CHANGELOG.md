# Changelog

Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/);
версионирование — [SemVer](https://semver.org/lang/ru/).

## [Unreleased]

### Added

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
