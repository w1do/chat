# STRUCTURE.md — раскладка монорепозитория

Развёртка раздела 4 «Инструкции по разработке Self-Hosted AI Chat» до уровня файлов.
Инструкция задаёт правила, этот файл — конкретные пути. При расхождении побеждает инструкция.

Размещение: рядом с `README.md`; раздел «Архитектура» в README ссылается сюда, а не дублирует дерево.

Namespace-плейсхолдер: PHP `Vendor\<Package>\`, npm `@vendor/<package>`, composer `vendor/<package>`.
Переименование — один раз до первого публичного релиза, дальше это ломающее изменение.

Статус разделов: `planned`. Дерево описывает целевую раскладку, а не реализованное состояние.

---

## 1. Верхний уровень

```text
/
├── apps/
│   ├── chat-api/                 Laravel composition root основного API
│   ├── chat-web/                 React-приложение чата
│   ├── admin-api/                НЕ создаётся в MVP — только по ADR
│   └── admin-web/                НЕ создаётся в MVP — только по ADR
├── packages/
│   ├── backend/
│   │   ├── shared-kernel/
│   │   ├── identity/
│   │   ├── chat/
│   │   ├── notifications/
│   │   ├── ai/
│   │   └── administration/
│   ├── contracts/                JSON Schema real-time событий — см. §9, требует решения
│   └── frontend/
│       ├── tooling/
│       ├── ui/
│       ├── api-client/
│       ├── identity/
│       ├── chat/
│       └── notifications/
├── infra/
│   ├── docker/
│   ├── compose/
│   └── supervisor/
├── docs/
│   ├── api/
│   ├── decisions/
│   ├── features/
│   ├── operations/
│   └── security/
├── .github/workflows/
├── README.md · SUMMARY.md · CHANGELOG.md · AGENTS.md · CLAUDE.md
├── LICENSE · SECURITY.md · SUPPORT.md
├── composer.json                 корневой: path repositories, скрипты качества
├── package.json · pnpm-workspace.yaml
├── pint.json · phpstan.neon · .editorconfig · .gitignore
└── .env.example                  указывает на infra/compose/.env.example
```

`admin-api` и `admin-web` присутствуют в инструкции как пример, а не как обязательный элемент.
В MVP их каталогов нет: пустой composition root — это два лишних CI-джоба и два образа,
которые никто не собирает. Появляются вместе с ADR, обосновывающим отдельный release lifecycle.

Корневой `composer.json` не является приложением. Он держит path repositories на
`packages/backend/*` и агрегирующие скрипты (`lint`, `stan`, `test:packages`), чтобы проверки
запускались из корня и покрывали все пакеты сразу.

---

## 2. `apps/chat-api` — composition root

Тонкий: подключает провайдеры пакетов, собирает итоговый OpenAPI, задаёт deployment-конфигурацию.
Бизнес-логики нет. Появление в нём `Domain/` или `Application/` — ошибка раскладки.

```text
apps/chat-api/
├── app/
│   ├── Models/User.php               конкретная модель, наследник identity-базы
│   ├── Providers/
│   │   ├── AppServiceProvider.php
│   │   ├── BroadcastServiceProvider.php
│   │   └── PackageWiringProvider.php  ← cross-package listeners: chat → notifications, chat → audit
│   ├── Http/Middleware/               только app-специфичное
│   └── Support/{ApiErrorEnvelope,TraceId}.php
├── bootstrap/
│   ├── app.php                        middleware, exceptions, providers пакетов
│   └── providers.php
├── config/
│   ├── octane.php · horizon.php · reverb.php · broadcasting.php · queue.php
│   ├── sanctum.php · cors.php · filesystems.php · cache.php · database.php
│   └── {identity,chat,notifications,ai,administration}.php   ТОЛЬКО опубликованные оверрайды
├── database/
│   ├── migrations/                    только framework: cache, jobs, job_batches, sessions
│   └── seeders/DatabaseSeeder.php
├── routes/
│   ├── api.php                        подключает route-файлы пакетов, задаёт prefix/middleware
│   ├── channels.php                   авторизация приватных и presence каналов
│   └── console.php
├── openapi/
│   ├── openapi.base.yaml              info, servers, securitySchemes, общие responses
│   ├── build.php                      сборка paths/schemas из подключённых пакетов
│   └── dist/openapi.json              артефакт, коммитится; CI сверяет с генерацией
├── tests/
│   ├── Integration/                   ← пакеты в собранном приложении (требование §4.1)
│   ├── Contract/{OpenApiResponseTest,RealtimeSchemaTest}.php
│   ├── Smoke/{HealthTest,ReadinessTest}.php
│   ├── Octane/WorkerStateLeakTest.php ← последовательные запросы разных пользователей
│   ├── Pest.php · TestCase.php
│   └── fixtures/
├── composer.json                      path repositories на ../../packages/backend/*
└── .env.example
```

Три файла, которые обязаны лежать именно здесь:

- **`app/Models/User.php`** — пакеты не знают конкретный класс. `identity` поставляет базовую
  модель и контракт, приложение наследует и подставляет через `config('identity.user_model')`.
- **`routes/channels.php`** — авторизация канала требует знания обо всех модулях сразу.
- **`app/Providers/PackageWiringProvider.php`** — единственная точка связывания пакетов.
  Если `chat` сам вызвал `notifications`, появилась скрытая связь, запрещённая §4.1.

`tests/Octane/` не факультативен: `singleton` с request-состоянием отдаёт данные чужого
пользователя, и обычные feature-тесты под PHP-FPM этого не видят.

---

## 3. Контракт backend-пакета

Эталон — `packages/backend/chat`. Остальные повторяют раскладку, создавая только нужные каталоги:
пустой `Infrastructure/AI/` в пакете, который не ходит в AI, — это «абстракция на будущее».

```text
packages/backend/chat/
├── composer.json                      Vendor\Chat\, зависимости только на contracts
├── src/
│   ├── ChatServiceProvider.php        свои bindings, config, migrations, routes, events, lang
│   ├── Domain/
│   │   ├── Models/{Room,RoomMember,Message,MessageReaction}.php
│   │   ├── Enums/{RoomVisibility,RoomRole,MessageState,ReactionEmoji}.php
│   │   ├── ValueObjects/{MessageBody,MentionList,MessageCursor}.php
│   │   ├── Events/{MessageCreated,MessageUpdated,MessageDeleted,
│   │   │            ReactionChanged,RoomMemberChanged,TypingChanged}.php
│   │   ├── Policies/{RoomPolicy,MessagePolicy,MembershipPolicy}.php
│   │   └── Contracts/{MessageSanitizer,PresenceRegistry}.php
│   ├── Application/
│   │   ├── Commands/{CreateRoom,UpdateRoom,ArchiveRoom,InviteMember,JoinRoom,LeaveRoom,
│   │   │             ChangeMemberRole,SendMessage,EditMessage,DeleteMessage,
│   │   │             ToggleReaction,MarkRoomRead,SetTyping}Command.php
│   │   ├── Queries/{ListRooms,GetRoom,ListMembers,ListMessages,GetMessage,
│   │   │            GetUnreadCounters}Query.php
│   │   ├── Handlers/
│   │   │   ├── Commands/{SendMessageHandler,…}.php
│   │   │   └── Queries/{ListMessagesHandler,…}.php
│   │   └── DTOs/{RoomData,MemberData,MessageData,ReactionData,CursorPage}.php
│   ├── Infrastructure/
│   │   ├── Broadcasting/{MessageCreatedV1,MessageUpdatedV1,MessageDeletedV1,
│   │   │                 ReactionChangedV1,RoomMemberChangedV1,TypingChangedV1}.php
│   │   ├── Persistence/{EloquentMessageReader,RoomQueryScopes}.php
│   │   └── Presence/RedisPresenceRegistry.php
│   └── Presentation/Http/Api/V1/
│       ├── Controllers/{RoomController,MemberController,MessageController,ReactionController}.php
│       ├── Requests/{CreateRoomRequest,SendMessageRequest,EditMessageRequest,…}.php
│       └── Resources/{RoomResource,MemberResource,MessageResource,ReactionResource}.php
├── config/chat.php                    лимиты, окно редактирования, диски, префиксы маршрутов
├── database/
│   ├── migrations/                    rooms, room_members, messages, message_reactions
│   └── factories/{RoomFactory,RoomMemberFactory,MessageFactory,MessageReactionFactory}.php
├── routes/{api.php,channels.php}      отключаемы конфигурацией пакета
├── resources/lang/{en,ru}/chat.php
├── openapi/
│   ├── paths/{rooms.yaml,rooms-members.yaml,rooms-messages.yaml,messages.yaml,reactions.yaml}
│   └── schemas/{Room.yaml,Member.yaml,Message.yaml,Reaction.yaml}
└── tests/
    ├── TestCase.php                   Orchestra Testbench: изолированный прогон
    ├── Unit/                          доменные правила, VO, политики
    └── Feature/                       маршруты пакета в testbench-приложении
```

Ключевое: `Domain/Events` и `Infrastructure/Broadcasting` — разные вещи. Доменное событие
происходит внутри транзакции и не знает про сокеты. Broadcast — версионированный транспорт
(`message.created.v1`) с урезанным payload, отправляемый после commit. Один класс на две роли
даёт либо рассылку до коммита, либо Eloquent-модель целиком в браузере.

### Остальные backend-пакеты

```text
packages/backend/shared-kernel/src/
├── Identifiers/{Ulid,Uuid,ActorId,RoomId,MessageId}.php
├── Contracts/{Identifiable,Clock,Actor}.php
├── Values/{Locale,Timezone}.php
└── Testing/InteractsWithPackages.php
    # бизнес-правила сюда не складывать (§4.1)

packages/backend/identity/
├── src/Domain/Models/{User,Session}.php          базовая модель, приложение наследует
├── src/Domain/Contracts/{Actor,UserRepository?}.php
├── src/Application/{Commands,Queries,Handlers,DTOs}/  Register, Login, Logout, ResetPassword,
│                                                       UpdateProfile, GetMe
├── src/Infrastructure/Auth/SanctumGuardAdapter.php
├── src/Presentation/Http/Api/V1/Controllers/{AuthController,MeController,ProfileController}.php
├── database/migrations/  users, password_reset_tokens, personal_access_tokens
└── config/identity.php   user_model, политика паролей, TTL сессии

packages/backend/notifications/
├── src/Domain/{Models/NotificationPreference,Enums/{Channel,Category},Contracts/PreferenceResolver}
├── src/Application/{Commands,Queries,Handlers,DTOs}/  UpdatePreferences, ListNotifications,
│                                                       MarkRead, ResolveRecipients
├── src/Infrastructure/
│   ├── Notifications/{NewMessageNotification,MentionNotification,RoomInviteNotification}.php
│   ├── Channels/DatabaseChannelAdapter.php
│   └── Jobs/{DeliverNotificationJob,SendDigestJob}.php   идемпотентные, с unique lock
├── database/migrations/  notifications, notification_preferences
└── config/notifications.php  очереди по категориям, окна группировки

packages/backend/ai/
├── src/Domain/
│   ├── Contracts/TextRevisionProvider.php        ← единственный порт наружу
│   ├── Enums/{RevisionOperation,Tone,RequestStatus}.php
│   ├── ValueObjects/{DraftText,RevisionResult,TokenUsage}.php
│   └── Models/AiRequest.php
├── src/Application/{Commands,Handlers,DTOs}/      ReviseDraft: fix, clarify, shorten, expand,
│                                                  change-tone, custom-instruction
├── src/Infrastructure/
│   ├── Providers/{OpenAiCompatibleProvider,OllamaProvider,OpenAiProvider,
│   │              AnthropicProvider,NullProvider}.php
│   ├── Prompts/{fix,clarify,shorten,expand,tone,custom}.system.txt
│   ├── Resilience/{Timeout,RetryPolicy,CircuitBreaker}.php
│   └── Quota/{RateLimiter,UsageRecorder}.php
├── src/Presentation/Http/Api/V1/Controllers/MessageRevisionController.php
├── database/migrations/  ai_requests
└── config/ai.php         enabled, provider, model, timeout, лимиты, цены

packages/backend/administration/
├── src/Domain/{Models/{AuditLog,SystemSetting},Enums/AuditAction,Contracts/AuditRecorder}.php
├── src/Application/{Commands,Queries,Handlers,DTOs}/  RecordAudit, ListAudit, UpdateSettings,
│                                                      GetSystemStatus
├── src/Infrastructure/Persistence/EloquentAuditRecorder.php
├── src/Presentation/Http/Api/V1/Controllers/{SettingsController,AuditController,StatusController}.php
├── database/migrations/  audit_logs, system_settings
└── config/administration.php
```

`administration` — пакет с API системного администрирования, не UI-панель. Filament, Blade и
Inertia в `chat-api` отсутствуют по разделу 3 инструкции; администрирование — это endpoints
плюс отдельный frontend, когда он понадобится.

---

## 4. Контракт frontend-пакета

```text
packages/frontend/tooling/
├── eslint/{base.js,react.js}
├── tsconfig/{base.json,react.json}
├── vite/{library.ts,app.ts}
└── vitest/setup.ts

packages/frontend/ui/src/
├── components/{Button,Dialog,Popover,Menu,Avatar,Tooltip,Toast,Skeleton,EmptyState}/
├── hooks/{useDisclosure,useHotkey,useLiveRegion}.ts
├── styles/{tokens.css,tailwind.preset.ts}
└── index.ts                            без продуктовой логики (§4.2)

packages/frontend/api-client/
├── codegen.config.ts                   источник: apps/chat-api/openapi/dist/openapi.json
├── src/generated/**                    ← генерируется, руками не править
├── src/{client.ts,errors.ts,index.ts}  обёртка над fetch: envelope, trace_id, 401/419/429
└── package.json

packages/frontend/chat/src/
├── components/{RoomList,RoomHeader,MessageList,MessageItem,MessageComposer,
│               ReplyPreview,ReactionBar,MentionPicker,TypingIndicator,PresenceDots}/
├── hooks/{useRooms,useMessages,useSendMessage,useEditMessage,useReactions,
│          useRealtimeRoom,useTyping,useReconnectSync}.ts
├── schemas/{message.ts,room.ts}        Zod, общие с React Hook Form
├── realtime/{eventMap.ts,handlers.ts}  типы событий из packages/contracts
├── adapters/{EchoAdapter,QueryAdapter,PermissionsContract}.ts  ← приходят из приложения
└── index.ts

packages/frontend/identity/src/       auth-формы, профиль, guard-хуки
packages/frontend/notifications/src/  лента, настройки каналов, счётчики
```

Каждый feature-пакет получает React, QueryClient, Router и Echo **от приложения** через
providers/adapters и не создаёт вторые экземпляры (§4.2). Иначе два QueryClient дают два кэша,
а второй Echo — вторую подписку и удвоенные сообщения на экране.

---

## 5. `apps/chat-web` — composition root фронтенда

```text
apps/chat-web/
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── providers.tsx              QueryClient, Echo, ErrorBoundary, тема, i18n
│   │   ├── router.tsx                 маршруты собираются из feature-пакетов
│   │   ├── runtime-config.ts          ← читает /config.json до рендера
│   │   ├── echo.ts · query-client.ts
│   │   └── permissions.ts             реализация типизированного контракта для features
│   ├── pages/{LoginPage,ChatPage,RoomSettingsPage,ProfilePage,NotificationsPage,NotFoundPage}.tsx
│   └── styles/index.css
├── public/config.template.json        подстановка переменных в entrypoint контейнера
├── e2e/{auth.spec.ts,messaging.spec.ts,realtime.spec.ts,ai-revision.spec.ts}   Playwright
├── index.html · vite.config.ts · tsconfig.json · package.json · .env.example
```

`runtime-config.ts` — допущение, не описанное в инструкции. Обоснование: self-hosted клиент
получает готовый образ и не пересобирает бандл, поэтому адрес Reverb, включённость AI и
брендинг не могут быть `VITE_*` переменными времени сборки. Альтернатива — эндпоинт
`GET /api/v1/config`; выбор оформить ADR.

---

## 6. `infra`

```text
infra/
├── docker/
│   ├── api/{Dockerfile,entrypoint.sh,php.ini,opcache.ini,healthcheck.sh}
│   ├── web/{Dockerfile,nginx.conf,entrypoint.sh}
│   └── proxy/{Caddyfile.example,nginx.proxy.conf.example}
├── compose/
│   ├── compose.prod.yaml
│   ├── compose.dev.yaml
│   ├── compose.override.example.yaml
│   └── .env.example                    все параметры с безопасными комментариями
└── supervisor/
    ├── supervisord.conf
    ├── octane.conf                     octane:start
    ├── horizon.conf                    stopwaitsecs > самой долгой job
    ├── scheduler.conf                  schedule:work
    └── reverb.conf                     reverb:start
```

### Процессы production-стека

| Сервис | Процесс | Замечание |
|---|---|---|
| `proxy` | reverse proxy | TLS и WebSocket termination; порт Reverb наружу не публикуется |
| `web` | статика SPA | подстановка `config.json` в entrypoint |
| `api` | `octane:start` | после deploy — graceful `octane:reload` |
| `worker` | `horizon` | `queue:work` по тем же очередям не запускать |
| `scheduler` | `schedule:work` | `horizon:snapshot` по расписанию |
| `reverb` | `reverb:start` | явный `allowed_origins`, wildcard запрещён |
| `postgres` · `redis` | official, закреплённые теги | |
| `minio` | опционально | S3-совместимое хранилище |

`infra/supervisor/*` входят в self-hosted bundle даже при Compose-развёртывании: они нужны для
поддерживаемого Linux/VM-профиля. В Compose при этом остаётся один основной процесс на контейнер.

---

## 7. `docs` и `.github`

```text
docs/
├── api/{rest-guidelines.md,error-envelope.md,realtime-events.md,versioning.md}
├── decisions/
│   ├── ADR-001-package-first-monorepo.md
│   ├── ADR-002-postgresql-and-redis.md
│   ├── ADR-003-reverb-realtime-delivery.md
│   ├── ADR-004-lightweight-cqrs.md
│   ├── ADR-005-sanctum-spa-auth.md
│   ├── ADR-006-ai-provider-interface-and-privacy.md
│   ├── ADR-007-docker-compose-delivery.md
│   ├── ADR-008-openapi-as-source-of-truth.md
│   └── ADR-009-octane-application-server.md      выбор сервера после проверки окружения
├── features/{authentication,profile,rooms,membership,messaging,replies,reactions,
│             mentions,presence-typing,notifications,ai-text-revision,administration}.md
├── operations/{installation,configuration,backup-restore,upgrade,troubleshooting,
│               supervisor,scaling,observability}.md
└── security/{threat-model,hardening,disclosure,secret-rotation}.md

.github/workflows/
├── pull-request.yml        lint · typecheck · stan · package tests · integration · openapi diff
├── security.yml            composer audit · npm audit · secret scan · container scan
├── release.yml             SemVer tag → образы, SBOM, checksum, provenance, compose bundle
├── deploy-staging.yml
└── deploy-production.yml   защищённый environment, ручное одобрение
```

Каждый `docs/features/*.md` несёт статус `planned` / `in progress` / `implemented` / `verified`.
Статус `implemented` ставится только при наличии кода и тестов в репозитории.

---

## 8. Матрица модулей

| Модуль | Пакет | Таблицы | Endpoints | Real-time |
|---|---|---|---|---|
| Identity | `backend/identity` | `users`, `password_reset_tokens`, `personal_access_tokens` | `/auth/*`, `/me` | — |
| Chat | `backend/chat` | `rooms`, `room_members`, `messages`, `message_reactions` | `/rooms`, `/rooms/{room}`, `/rooms/{room}/members`, `/rooms/{room}/messages`, `/messages/{message}`, `/messages/{message}/reactions` | `message.created.v1`, `message.updated.v1`, `message.deleted.v1`, `reaction.changed.v1`, `room.member_changed.v1`, `typing.changed.v1` |
| Notifications | `backend/notifications` | `notifications`, `notification_preferences` | `/notifications`, `/notification-preferences` | доставка через приватный канал пользователя |
| AI | `backend/ai` | `ai_requests` | `/ai/message-revisions` | — (ответ синхронный либо по job-статусу) |
| Administration | `backend/administration` | `audit_logs`, `system_settings` | `/admin/*` | — |

---

## 9. Куда класть новый код

| Что пишешь | Куда |
|---|---|
| Валидация транспорта | `packages/backend/<pkg>/src/Presentation/Http/Api/V1/Requests/` |
| Мутация | `.../Application/Commands/` + `Handlers/Commands/` |
| Чтение | `.../Application/Queries/` + `Handlers/Queries/` |
| Инвариант предметной области | `.../Domain/` (модель, VO, enum, policy) |
| Адаптер провайдера, брокера, хранилища | `.../Infrastructure/` |
| Имя и payload real-time события | `.../Infrastructure/Broadcasting/` + схема в `packages/contracts/` |
| Авторизация канала | `apps/chat-api/routes/channels.php` |
| Связка двух пакетов | `apps/chat-api/app/Providers/PackageWiringProvider.php` |
| Экран или виджет | `packages/frontend/<feature>/src/components/` |
| Примитив дизайн-системы | `packages/frontend/ui/src/components/` |
| Композиция маршрутов и провайдеров | `apps/chat-web/src/app/` |
| Supervisor/compose/образ | `infra/` |

### Чего в дереве быть не должно

- `Domain/` или `Application/` внутри `apps/*` — composition root не место для логики.
- Миграции пакета, скопированные в `apps/chat-api/database/migrations` — их загружает provider пакета.
- Прямое обращение к моделям, таблицам или config-ключам чужого пакета — только через contracts.
- Циклические composer-зависимости между пакетами; вызов `notifications` изнутри `chat`.
- Deep imports вида `@vendor/chat/src/components/MessageList` — только публичные exports.
- Ручные правки в `packages/frontend/api-client/src/generated/**`.
- `app()`/`resolve()` внутри Application- и Domain-классов.
- `singleton` с request-состоянием — под Octane это утечка данных между пользователями.
- Blade, Inertia, Filament в `chat-api`.
- Пустые каталоги «под будущее»: `Infrastructure/AI/` в пакете, который в AI не ходит.

---

## 10. Открытые вопросы

Требуют решения до старта; каждый — кандидат в ADR.

1. **`packages/contracts` отсутствует в дереве раздела 4, но упомянут в разделе 8** как место
   описания WebSocket-событий. Предложение: отдельный языконезависимый пакет с JSON Schema,
   из которого генерируются PHP-DTO и TypeScript-типы. Альтернатива — держать схемы в
   `packages/backend/<pkg>/contracts/` и собирать в приложении, как OpenAPI.
2. **Владение `users`.** Предложено: таблица и базовая модель в `identity`, `App\Models\User`
   наследует, класс подставляется через `config('identity.user_model')`. Требует фиксации,
   иначе каждый пакет начнёт тянуть конкретный класс.
3. **Octane server** — RoadRunner или FrankenPHP. Инструкция откладывает выбор до ADR; от него
   зависят `infra/docker/api/Dockerfile` и `infra/supervisor/octane.conf`.
4. **Runtime-конфигурация SPA** — `public/config.json` против `GET /api/v1/config`. Без решения
   self-hosted клиент не сменит домен без пересборки образа.
5. **`admin-api` / `admin-web`** — подтвердить, что в MVP они не создаются.
6. **Presence** — Redis-реестр в `chat` против presence-каналов Reverb как источника истины.
   Влияет на правило «не уведомлять того, кто сейчас в комнате».
