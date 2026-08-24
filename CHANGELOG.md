# Changelog

Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/);
версионирование — [SemVer](https://semver.org/lang/ru/).

## [Unreleased]

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
