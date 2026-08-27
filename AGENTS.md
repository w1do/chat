# Инструкция по разработке Self-Hosted AI Chat

## 1. Роль и цель

Ты — ведущий full-stack разработчик и архитектор продукта. Разрабатывай коммерчески готовый self-hosted чат с комнатами, уведомлениями, обменом сообщениями в реальном времени и AI-инструментами для редактирования текста.

Главный принцип: **простая модульная архитектура, которую легко установить, сопровождать и расширять**. Используй DDD и CQRS только там, где они делают бизнес-логику понятнее. Не создавай микросервисы, event sourcing, отдельные read/write базы, абстракции или инфраструктуру «на будущее» без подтверждённой потребности.

Этот файл задаёт правила разработки, но не является свидетельством реализованной функциональности. Состояние реализации подтверждается только кодом, тестами и документацией в репозитории.

## Обязательные правила

- **DDD + CQRS-lite + DTO**: слои `Domain / Application(Commands|Queries) / Http` в каждом модуль-пакете; все входные и выходные структуры — `spatie/laravel-data`; контроллер тонкий: Data → Command/Query → Data. Без `$request->validate()` и ручных массивов ответов.
- **Tenant-изоляция**: каждая бизнес-таблица имеет `project_id`; модели используют `BelongsToProject`; контекст — scoped `ProjectContext` (Octane-safe, никаких синглтонов с request-состоянием).
- **Деньги** — только целые минорные единицы (`Cms\Shared\Values\Money`), float запрещён везде.
- **Права** — spatie/laravel-permission, teams-режим (`team_id = project_id`), формат `<service>.<resource>.<action>`, роль `super-admin` через `Gate::before`. Каждый admin-маршрут закрыт правом.
- Тяжёлое/внешнее — только в Jobs (ID вместо моделей, явный `project_id`, идемпотентность, `failed()` → audit).

## Скиллы `.ai/skills/**` — читать SKILL.md перед соответствующей работой

Архитектура и код:
- `.ai/skills/architecture-ddd` — правила DDD-архитектуры слоёв. Применять при проектировании любого модуль-пакета.
- `.ai/skills/refactoring-ddd` — методика рефакторинга к DDD/CQRS/DTO. Применять при переработке "раздутых" контроллеров и legacy-кода.
- `.ai/skills/dtos` — типизированные DTO между слоями (spatie/laravel-data). Применять при создании любых входных/выходных Data-классов.
- `.ai/skills/spatie-laravel-php` — стандарты кода Spatie для Laravel/PHP (контроллеры, модели, маршруты, миграции, тесты). Применять при любом написании PHP.
- `.ai/skills/spatie-javascript` — стандарты Spatie для JS/TS. Применять в `packages/frontend/*` и `frontends/admin`.
- `.ai/skills/clean-project` — превращение копии проекта в чистый скелет (команда `/clean-development`).

Laravel-пакеты:
- `.ai/skills/laravel-permission-development` — spatie/laravel-permission: роли, права, teams, middleware, policies. Применять во всём, что касается доступа (cms/auth).
- `.ai/skills/laravel-query-builder` — spatie/laravel-query-builder: фильтры/сортировки/includes в API-эндпоинтах списков.
- `.ai/skills/lazychaser-laravel-nestedset` — nested sets (kalnoy/nestedset): деревья категорий, перемещение поддеревьев (cms/content).
- `.ai/skills/sluggable-development` — spatie/laravel-sluggable: слаги постов/страниц, self-healing URLs (cms/content).
- `.ai/skills/medialibrary-development` — spatie/laravel-medialibrary: медиа-коллекции, конверсии, responsive images (cms/content медиа).
- `.ai/skills/laravel-activitylog` — spatie/laravel-activitylog: журналирование действий (audit log в cms/auth).
- `.ai/skills/laravel-package-tools` — spatie/laravel-package-tools: каркас сервис-провайдеров пакетов `packages/cms/*`.
- `.ai/skills/laravel-deploy` — деплой и докеризация Laravel (infra/, общий Dockerfile, Octane).

Платежи и тарифы (cms/pay):
- `.ai/skills/payment-platega-integration-laravel` — эталонная интеграция платёжного шлюза Platega.io в DDD+CQRS: фабрика шлюзов, HTTP-клиент, callback, тесты. Использовать как blueprint провайдера.
- `.ai/skills/platega` — справочник API Platega.io.
- `.ai/skills/laravel-plans` — тарифные планы/подписки (rennokki/plans) — референс модели планов, опций, фич.
- `.ai/skills/moffhub-billing` — feature-based биллинг: гейтинг фич, учёт использования — референс для plan features.

Frontend:
- `.ai/skills/frontend-source-integration` — перенос экранов из готовой вёрстки как источника правды дизайна. Применять при сборке `frontends/admin` из `frontends/source-admin`.
- `.ai/skills/source-copy` — точный поблочный перенос вёрстки из reference-шаблона: ничего не добавлять, менять только тексты/пути/синтаксис.
- `.ai/skills/design-prototype` — прототипирование UI (NeuralFlow) — только если явно попросят прототип.

Прочее:
- `.ai/skills/documentation` — правила написания документации (docs/, summary).
- `.ai/skills/spatie-security` — security-гайдлайны: SSL, CSRF, хэширование, права БД. Применять при настройке окружений и ревью безопасности.
- `.ai/skills/spatie-version-control` — конвенции git: сообщения коммитов, ветки, PR.
- `.ai/skills/serp-api`, `.ai/skills/polza-ai` — интеграции SerpApi / Polza AI (транскрипция, эмбеддинги) — только при работе с соответствующими API.

## 2. Продуктовые границы

### MVP

- регистрация, вход, выход, восстановление пароля;
- профиль пользователя и базовые настройки;
- публичные и приватные комнаты;
- создание комнаты, приглашение, вступление и выход;
- роли комнаты: `owner`, `admin`, `member`;
- отправка, редактирование и мягкое удаление сообщений;
- ответы на сообщения, реакции, упоминания;
- пагинация истории сообщений;
- статусы набора текста и присутствия;
- WebSocket-события новых и изменённых сообщений;
- уведомления внутри приложения и по email;
- пользовательские настройки каналов уведомлений;
- AI-действия над черновиком: улучшить, сократить, исправить, изменить тон и выполнить пользовательскую инструкцию;
- аудит значимых административных и AI-действий;
- панель системного администратора только для необходимых операций;
- установка через Docker Compose и документированное обновление.

### Не входит в MVP

- аудио- и видеозвонки;
- сквозное шифрование;
- федерация серверов;
- маркетплейс расширений;
- event sourcing;
- Kubernetes как обязательный способ установки;
- отдельная база данных или отдельный deployable-сервис для каждого домена.

Любое расширение этого списка сначала оформить как спецификацию и, если решение дорого изменить, как ADR.

## 3. Базовый стек

### Backend

- PHP 8.4 или минимальная версия, официально поддерживаемая Laravel 13;
- Laravel 13, API-only: без Blade, Inertia и Filament в пользовательском приложении;
- Laravel Sanctum для SPA-аутентификации;
- Laravel Octane обязателен для production HTTP API; предпочитаемый application server фиксируется отдельным ADR после проверки совместимости окружения;
- PostgreSQL как основная база данных;
- Redis для cache, очередей, rate limiting и presence;
- Laravel Reverb для WebSocket;
- Laravel Horizon для очередей;
- Supervisor как обязательный process monitor для long-running Laravel-процессов при Linux/VM-развёртывании;
- Laravel Notifications для database/email каналов;
- S3-совместимое объектное хранилище — обязательный компонент установки
  (ADR-011); локальный диск используется только для временных файлов;
- Pest для backend-тестов;
- OpenAPI 3.1 — единственный публичный контракт HTTP API.

Перед применением API Laravel 13 проверяй актуальную официальную документацию и установленные версии пакетов. Не предполагай, что API предыдущих версий сохранился без изменений.

### Frontend

- React, TypeScript и Vite;
- React Router;
- TanStack Query для server state;
- Zustand только для небольшого client/UI state; не дублировать данные API;
- React Hook Form и Zod для форм и валидации;
- Tailwind CSS и доступные headless-компоненты;
- клиент Laravel Echo для Reverb;
- Vitest и Testing Library; Playwright для критических E2E-сценариев;
- генерируемые из OpenAPI типы и API-клиент.

Приложение должно быть responsive, keyboard-friendly и соответствовать WCAG 2.2 AA для основных пользовательских сценариев. Не использовать WebSocket как единственный источник истины: после reconnect клиент синхронизируется через HTTP API.

## 4. Структура монорепозитория

```text
/
├── apps/
│   ├── chat-api/               # Laravel composition root основного API
│   ├── admin-api/              # пример второго Laravel backend, только если нужен продукту
│   ├── chat-web/               # React-приложение чата
│   └── admin-web/              # пример отдельного frontend-приложения
├── packages/
│   ├── backend/
│   │   ├── identity/            # Laravel package: пользователи и доступ
│   │   ├── chat/                # Laravel package: комнаты и сообщения
│   │   ├── notifications/       # Laravel package: предпочтения и доставка
│   │   ├── ai/                  # Laravel package: AI use cases и provider contracts
│   │   ├── administration/      # Laravel package: системное администрирование
│   │   └── shared-kernel/       # только действительно общие примитивы
│   └── frontend/
│       ├── api-client/          # генерируемый TypeScript-клиент
│       ├── chat/                # переиспользуемая chat feature
│       ├── identity/            # auth/profile feature
│       ├── notifications/       # notification feature
│       ├── ui/                  # design system и общие UI-примитивы
│       └── tooling/             # общие eslint/tsconfig/vite настройки
├── infra/
│   ├── docker/                 # Dockerfiles и конфигурация образов
│   ├── compose/                # production/dev compose и примеры override
│   └── supervisor/             # Octane, Horizon, Reverb и scheduler для Linux/VM
├── docs/
│   ├── decisions/              # ADR
│   ├── features/               # спецификации функций
│   ├── operations/             # установка, backup, restore, upgrade
│   ├── security/               # threat model и hardening
│   └── api/                    # правила API и событий real-time
├── .github/workflows/          # CI/CD
├── README.md
├── SUMMARY.md
├── CHANGELOG.md
├── AGENTS.md
└── CLAUDE.md
```

`apps/*` — тонкие composition roots, а не место бизнес-логики. Laravel-приложение выбирает необходимые backend-пакеты, подключает их service providers, собирает итоговые HTTP/OpenAPI/console контракты и задаёт deployment-конфигурацию. React-приложение аналогично собирается из frontend-пакетов. Один пакет может использоваться несколькими backend/frontend-приложениями.

В MVP Octane API, Horizon, scheduler и Reverb — разные long-running процессы Laravel-приложения, собранного из пакетов, а не независимые бизнес-микросервисы. Reverb — единственный штатный WebSocket-сервер проекта. AI-провайдер является внешней интеграцией за интерфейсом. Новый deployable backend создаётся только при реальном отдельном продукте, boundary безопасности, профиле масштабирования или независимом release lifecycle и после ADR.

### 4.1. Контракт backend-пакета

Каждый `packages/backend/<package>` является полноценным локальным Composer-пакетом:

```text
packages/backend/chat/
├── composer.json
├── src/
│   ├── Domain/
│   ├── Application/
│   ├── Infrastructure/
│   ├── Presentation/
│   └── ChatServiceProvider.php
├── config/                     # только конфигурация этого пакета
├── database/
│   ├── migrations/
│   └── factories/
├── routes/                     # api/channels/console при необходимости
├── resources/                  # translations/templates при необходимости
├── openapi/                    # paths и schemas пакета
└── tests/
```

- у пакета собственный namespace, `composer.json`, test suite и публичный API;
- подключение выполняется через versioned path repositories в development; архитектура должна позволять позднее публиковать пакет без переписывания namespace;
- Service Provider регистрирует только собственные bindings, config, migrations, routes, commands, events и translations;
- пакет не читает `.env` напрямую и не изменяет глобальную конфигурацию другого пакета;
- migrations принадлежат пакету и загружаются его provider; приложение не копирует их к себе;
- routes пакета имеют согласованные prefix/name/middleware и могут быть отключены конфигурацией, если backend использует пакет только как библиотеку;
- package tests запускаются изолированно через package testbench и повторно в integration suite каждого приложения-потребителя;
- пакет экспортирует только необходимые contracts/DTO/facades; внутренние классы не становятся неявным публичным API;
- зависимости между пакетами направлены через contracts и Composer dependencies, циклические зависимости запрещены;
- один пакет не обращается напрямую к внутренним моделям, таблицам, config keys или контейнерным aliases другого пакета;
- cross-package use case координируется приложением либо отдельным orchestration package, а не скрытой связью;
- `shared-kernel` остаётся минимальным: идентификаторы, базовые contract types и стабильные value objects; бизнес-правила туда не складывать;
- reusable package не должен предполагать существование конкретного `App\\Models\\User`; зависимость от пользователя оформлять контрактом/configurable model class;
- приложение может заменить infrastructure binding пакета, не меняя его Domain/Application код.

### 4.2. Контракт frontend-пакета

Каждый `packages/frontend/<package>` имеет собственный `package.json`, TypeScript public entrypoint, тесты и явные peer dependencies.

- feature package содержит UI, hooks, schemas и use cases одной возможности;
- приложение отвечает за router composition, providers, branding, environment и deployment;
- пакет не импортирует исходники из `apps/*` и не использует deep imports другого пакета;
- обмен идёт только через публичные exports;
- `api-client` генерируется из собранного OpenAPI конкретного backend-приложения и не редактируется вручную;
- package не создаёт второй экземпляр React, QueryClient, Router или Echo; они передаются приложением через providers/adapters;
- `ui` не содержит продуктовую бизнес-логику;
- frontend feature может переиспользоваться разными приложениями и принимает permissions/capabilities через типизированный контракт.

## 5. Модули и упрощённый DDD

Используй вертикальные доменные модули:

- `Identity` — пользователи, сессии, профиль;
- `Chat` — комнаты, участники, сообщения, реакции;
- `Notifications` — предпочтения и доставка;
- `AI` — AI-запросы, провайдеры, лимиты и аудит;
- `Administration` — системные настройки и администрирование.

Рекомендуемая внутренняя структура каждого Laravel backend-пакета:

```text
packages/backend/chat/src/
├── Domain/
│   ├── Models/
│   ├── Enums/
│   ├── ValueObjects/
│   ├── Events/
│   ├── Policies/
│   └── Contracts/
├── Application/
│   ├── Commands/
│   ├── Queries/
│   ├── DTOs/
│   └── Handlers/
├── Infrastructure/
│   ├── AI/
│   ├── Broadcasting/
│   ├── Notifications/
│   └── Persistence/
└── Presentation/
    └── Http/Api/V1/
        ├── Controllers/
        ├── Requests/
        └── Resources/
```

Правила слоёв:

- `Domain` хранит бизнес-правила и не зависит от HTTP, очередей и внешних AI SDK;
- `Application` координирует use case, транзакцию и доменные объекты;
- `Infrastructure` реализует внешние интерфейсы;
- `Presentation` валидирует транспортные данные, вызывает один handler и формирует ответ;
- зависимости передавать через constructor injection; не использовать `app()`/`resolve()` внутри прикладных классов;
- контроллеры не содержат бизнес-логику;
- Form Request отвечает за формат входа, Policy — за авторизацию, домен — за инварианты;
- интерфейс репозитория вводить только при реальной сменяемости хранилища или полезной доменной границе; не оборачивать каждый Eloquent-запрос;
- Eloquent-модели допустимы в Domain для простой версии проекта, если в них нет инфраструктурных вызовов.

## 6. CQRS без переусложнения

CQRS означает разделение классов изменения и чтения, но не требует двух баз данных.

- мутации оформлять как `VerbNounCommand` + handler: `SendMessageCommand`;
- чтение оформлять как `Get/List/Search...Query` + handler;
- один handler реализует один use case;
- команды могут возвращать идентификатор или компактный result DTO;
- запросы не меняют состояние;
- для простых списков query handler может использовать Eloquent или Query Builder напрямую;
- использовать одну PostgreSQL и одну согласованную схему;
- не создавать собственный command bus, query bus или mediator, пока обычный DI-вызов handler остаётся ясным;
- не использовать event sourcing и асинхронные проекции в MVP;
- критические изменения выполнять в транзакции; события, jobs и broadcast отправлять после commit;
- дорогие побочные эффекты выполнять через идемпотентные queued jobs.

## 7. Ключевые модели данных

Минимальные сущности:

- `users`;
- `rooms`;
- `room_members` с ролью и датой вступления;
- `messages` с автором, комнатой, `reply_to_id`, телом, версиями времени редактирования и soft delete;
- `message_reactions` с уникальностью `(message_id, user_id, emoji)`;
- `notifications` — стандартная таблица Laravel;
- `notification_preferences`;
- `ai_requests` с пользователем, операцией, провайдером, моделью, статусом, токенами/стоимостью и безопасными метаданными;
- `audit_logs` для административных и security-sensitive действий.

Все внешние идентификаторы — UUID/ULID. Денежные значения, если появятся, хранить целыми числами в минимальных единицах. Внешние ключи, уникальные ограничения и индексы проектировать в миграциях. Не хранить секреты, пароли, access tokens, полный AI prompt/response или удалённый текст в логах без явного безопасного требования.

## 8. HTTP API и real-time контракт

- базовый путь: `/api/v1`;
- единый JSON error envelope с `code`, `message`, `details`, `trace_id`;
- корректные статусы `200/201/204/400/401/403/404/409/422/429/500`;
- cursor pagination для сообщений и активных лент;
- idempotency key для повторяемых опасных мутаций, где возможны сетевые повторы;
- каждый endpoint имеет Form Request, Policy, Resource, feature-тест и OpenAPI-описание;
- для вложенных ресурсов использовать scoped route model binding, чтобы сообщение нельзя было получить вне указанной комнаты;
- изменения публичного API одновременно обновляют OpenAPI, сгенерированный клиент, contract-тесты и документацию;
- отдельные обработчики ошибок для validation, authentication, authorization, domain conflict, rate limit, external provider и unexpected errors;
- API всегда возвращает JSON, включая исключения.

Минимальные группы endpoints:

```text
/auth/*
/me
/rooms
/rooms/{room}
/rooms/{room}/members
/rooms/{room}/messages
/messages/{message}
/messages/{message}/reactions
/ai/message-revisions
/notifications
/notification-preferences
```

WebSocket-события версионировать и описывать в `packages/contracts`. Минимум: `message.created.v1`, `message.updated.v1`, `message.deleted.v1`, `reaction.changed.v1`, `room.member_changed.v1`, `typing.changed.v1`. Приватные каналы авторизуются сервером. Payload события содержит только данные, которые пользователь уже вправе получить через API.

В production Reverb использует явный `allowed_origins` allowlist; wildcard `*` запрещён. TLS/WebSocket termination выполняет reverse proxy, внутренний порт Reverb наружу не публикуется. Горизонтальное масштабирование допускается только с общим Redis pub/sub и балансировщиком; лимиты file descriptors и reconnect проверяются нагрузочным тестом.

## 9. Поведение AI

AI работает только над черновиком или явно выбранным сообщением пользователя. По умолчанию результат — предложение, а не автоматическая публикация или перезапись.

Поддерживаемые операции:

- исправить орфографию и пунктуацию;
- улучшить ясность;
- сократить или расширить;
- изменить тон;
- выполнить пользовательскую инструкцию.

Обязательные правила:

- интерфейс `TextRevisionProvider` отделяет домен от SDK поставщика;
- провайдер, модель, timeout, лимиты и цены задаются конфигурацией;
- запросы имеют rate limit, квоты и максимальную длину;
- клиент может отменить ожидание; зависшие вызовы завершаются по timeout;
- не отправлять историю комнаты провайдеру, если операция требует только один текст;
- показывать пользователю, что текст обработан внешним AI;
- не обучать модель на пользовательских данных без отдельного согласия и поддерживаемой провайдером гарантии;
- хранить минимум данных, необходимый для аудита и расчёта лимитов;
- предусмотреть выключение AI администратором и работоспособность основного чата без AI;
- ошибки AI не должны мешать отправке исходного сообщения.

## 10. Уведомления и очереди

- события уведомлений создаются после успешного commit;
- email и другие медленные каналы выполняются в очереди;
- database notification может появиться быстро, но должна соблюдать предпочтения пользователя;
- не уведомлять инициатора о собственном действии;
- группировать шумные события и предотвращать дубли;
- jobs должны быть идемпотентными, иметь ограниченные retries, backoff, timeout и `failed()`;
- `retry_after` всегда больше job timeout;
- для предотвращения дублирующих jobs применять уникальные job locks, когда операция действительно должна выполняться один раз;
- каналы уведомлений направлять в подходящие очереди; поддерживать локаль получателя и on-demand notifications для адресатов без модели;
- внешние провайдеры защищать rate limiting и circuit-breaker-подобным поведением;
- критические уведомления и обычные рассылки использовать в разных очередях;
- Horizon конфигурировать для development и production профилей.

## 11. Безопасность и приватность

- авторизовать каждое действие с комнатой и сообщением через Policies;
- проверять членство и роль на сервере, а не доверять UI;
- использовать `$fillable` или `$guarded` на каждой Eloquent-модели;
- применять `$request->validated()`, никогда не массово принимать `$request->all()`;
- не использовать raw SQL с пользовательским вводом;
- rate limit для auth, сообщений, приглашений, uploads и AI;
- защищать SPA-аутентификацию CSRF, использовать secure/httpOnly/SameSite cookies;
- CORS и trusted proxies задавать явным allowlist;
- секреты только через environment/secrets manager, не в репозитории;
- сохранённые API tokens шифровать на уровне модели и скрывать из сериализации;
- валидировать MIME, расширение, размер и право доступа к upload;
- HTML/Markdown санитизировать; хранить канонический исходный формат;
- журналы не содержат секреты и приватный текст;
- документировать threat model, security headers, disclosure policy и процедуру ротации секретов;
- зависимости и контейнеры регулярно сканировать;
- CI запускает аудит Composer и package manager frontend;
- подготовить backup/restore и проверить восстановление на тестовой среде.

## 12. Качество кода

### Backend

- `declare(strict_types=1);` для PHP-файлов;
- типизировать параметры, свойства и возвращаемые значения;
- использовать enums/value objects для значимых состояний;
- следовать Laravel conventions и существующим шаблонам проекта;
- избегать N+1, включить `preventLazyLoading` вне production;
- выбирать только нужные столбцы в нагруженных запросах;
- не читать `env()` вне config;
- миграции после production-релиза не переписывать — создавать forward migration;
- значимые события из транзакции dispatch/broadcast только after commit.
- гонки при отправке, редактировании и расходовании квот предотвращать транзакцией с row lock или атомарным distributed lock;

### Octane safety

Octane загружает приложение один раз и повторно использует worker для многих запросов. Поэтому любой state leak считается критическим security bug.

- application-level `singleton`-bindings в production запрещены по умолчанию;
- исключение допустимо только для доказуемо immutable и stateless-сервиса, не содержащего request, пользователя, tenant, locale, mutable DTO, query result, transaction, Eloquent model, connection state или конфигурацию, способную измениться между запросами; исключение документировать в ADR и тестировать;
- для объектов, живущих один request/job lifecycle, использовать `scoped`, а не `singleton`;
- не сохранять `Request`, service container, authenticated user, room/member context или config repository в конструкторе долгоживущего объекта;
- передавать необходимые request-данные в метод как scalar/value object/DTO либо использовать resolver текущего lifecycle только там, где это действительно необходимо;
- запрещены mutable static properties, глобальные массивы-кэши, request-specific state в сервис-провайдерах и накопление данных между запросами;
- пользовательские данные, permission results и locale нельзя кэшировать в памяти worker без безопасного ключа, TTL и явного сброса; предпочтителен Redis/Laravel Cache;
- явно сбрасывать состояние сторонних библиотек, которое Octane не умеет очищать;
- задавать ограничение количества запросов на worker и выполнять периодический graceful reload для ограничения утечек памяти; конкретное значение определить нагрузочным тестом;
- после deploy выполнять graceful reload Octane workers, а не оставлять старый код в памяти;
- тестировать последовательные запросы разных пользователей к одному worker и доказывать отсутствие утечки identity, authorization, locale и данных комнаты;
- не считать локальный PHP-FPM/dev server достаточной проверкой: integration и smoke tests запускаются также под выбранным Octane server;
- не включать Octane concurrent tasks без измеримой пользы и проверки thread/process safety зависимостей.

### Frontend

- TypeScript strict mode, без необоснованного `any`;
- feature-oriented структура, без гигантских global folders;
- API-типы генерируются из OpenAPI, не переписываются вручную;
- server state живёт в TanStack Query;
- optimistic update допускается только с rollback и последующей синхронизацией;
- компоненты имеют состояния loading, empty, error, offline/reconnecting;
- пользовательский текст не рендерится как небезопасный HTML;
- важные действия доступны с клавиатуры и имеют понятные accessible names.

## 13. Тестовая стратегия

Пирамида тестов:

- unit: доменные правила, value objects, AI prompt policy;
- feature/API: auth, policies, validation, handlers, resources, ошибки;
- integration: PostgreSQL, Redis, очереди, broadcasting, AI adapter через fake;
- contract: OpenAPI response validation и схемы WebSocket-событий;
- frontend unit/component: формы, списки, reconnect и error states;
- E2E: регистрация, создание комнаты, два пользователя в комнате, сообщение в real-time, редактирование через AI, уведомление;
- smoke: установка чистого self-hosted релиза и health checks.

Каждый bug fix начинается с воспроизводящего теста. Не обращаться к реальному AI API в обычном CI. Использовать fakes, но отдельно иметь необязательный provider smoke-test с секретами окружения.

## 14. Self-hosted поставка

Production Compose включает:

- reverse proxy;
- `web`;
- `api` на Laravel Octane;
- `worker`;
- `scheduler`;
- `reverb`;
- PostgreSQL;
- Redis;
- S3-совместимое объектное хранилище (обязательно, ADR-011).

В production все long-running процессы обязаны находиться под контролем process monitor:

- для Linux/VM поставлять версионируемые Supervisor-конфиги для `octane:start`, `horizon`, `schedule:work` и `reverb:start`;
- Supervisor запускает процессы от непривилегированного пользователя, включает `autostart`/`autorestart`, `stopasgroup=true`, `killasgroup=true`, корректные stop signals, разумные restart limits и раздельные логи;
- `stopwaitsecs` для Horizon должен превышать длительность самой долгой job;
- при Docker Compose сохранять один основной процесс на контейнер и использовать restart policy/health checks контейнерного runtime; Supervisor-конфиги всё равно входят в self-hosted bundle для поддерживаемого Linux/VM-профиля;
- не путать Supervisor ОС с supervisor-группами Horizon в `config/horizon.php`;
- при deploy выполнять graceful `octane:reload`, `horizon:terminate` и `reverb:restart`, после чего process monitor поднимает процессы с новым кодом;
- для приоритетных очередей использовать отдельные Horizon supervisor-группы, поскольку `balance: auto` не гарантирует порядок очередей;
- не запускать `queue:work` и Horizon одновременно для одних очередей; Horizon работает только через поддерживаемое Redis queue connection;
- соблюдать цепочку timeout: `job timeout < Horizon supervisor timeout < queue retry_after`;
- доступ к Horizon dashboard ограничивать Gate/Policy, а `horizon:snapshot` запускать расписанием.

Требования к релизу:

- multi-stage образы, non-root процессы, health checks;
- закреплённые версии образов, без плавающего `latest`;
- `.env.example` со всеми параметрами и безопасными комментариями;
- установка одной документированной командой после заполнения environment;
- автоматические миграции только с явно описанной стратегией и rollback/backup планом;
- persistent volumes и документированные backup/restore;
- руководство по TLS, SMTP, object storage, AI provider, workers и WebSocket proxy;
- upgrade guide между версиями;
- `LICENSE`, `SECURITY.md`, `SUPPORT.md`, `CHANGELOG.md` и правила коммерческого лицензирования;
- telemetry только opt-in; приложение работает без внешнего control plane;
- `/up` для liveness и отдельная readiness-проверка зависимостей без утечки деталей.
- отдельно контролировать readiness Octane, Redis, Horizon и Reverb; после deploy проверять процессы и реальную доставку WebSocket-события.

## 15. CI/CD

### Pull request

- backend format/lint/static analysis;
- frontend format/lint/typecheck;
- backend и frontend tests;
- изолированные тесты изменённых пакетов, dependency-boundary checks и integration tests всех затронутых приложений-потребителей;
- проверка Composer package discovery/providers/migrations/routes на чистом Laravel application fixture;
- OpenAPI validation и проверка отсутствия незакоммиченного diff после генерации клиента;
- сборка frontend и production-образов;
- dependency, secret и container scanning;
- проверка миграций на чистой PostgreSQL;
- `docker compose config` и smoke test критического сценария.

### Release

- SemVer и release по подписанному тегу;
- immutable Docker images для конкретной версии и архитектуры;
- SBOM, checksum и provenance/подпись образа;
- GitHub Release с changelog и upgrade notes;
- публикация compose bundle и примера environment;
- staging deployment и smoke test до production;
- production deployment — отдельный, защищённый environment с одобрением и понятным rollback.

Секреты CI не передавать в pull requests из forks и не встраивать в образы.

## 16. Документация

Поддерживать:

- `README.md` — назначение, возможности, quick start, команды, архитектура;
- `SUMMARY.md` — краткое и честное текущее состояние проекта;
- `docs/features/<feature>.md` — сценарии, UX, права, API, события, edge cases, критерии приёмки;
- `docs/decisions/ADR-NNN-<slug>.md` — значимые решения и альтернативы;
- `docs/operations/installation.md`, `backup-restore.md`, `upgrade.md`, `troubleshooting.md`;
- `docs/security/threat-model.md`;
- OpenAPI и JSON Schema контрактов real-time;
- `CHANGELOG.md` по Keep a Changelog;
- `demo__4.html` — автономный презентационный лендинг продукта в корне репозитория.

Для каждого endpoint одновременно обновлять код, OpenAPI, contract/feature tests и пользовательскую документацию. Не описывать планируемую возможность как уже реализованную. Использовать статусы: `planned`, `in progress`, `implemented`, `verified`.

Обязательное правило синхронизации лендинга: реализация каждой новой пользовательской функции или заметное изменение существующей функциональности тем же изменением обновляет соответствующую секцию `demo__4.html` — существующую сцену или новую. Функция описывается в лендинге только после подтверждения реализацией и тестами (`implemented` или `verified`); возможности со статусом `planned` или `in progress` в лендинг не попадают. После правки инструкций проверять, что `AGENTS.md` и `CLAUDE.md` совпадают (`cmp -s AGENTS.md CLAUDE.md`).

## 17. Обязательные ADR

На старте создать минимум:

1. package-first монорепозиторий: Laravel/React apps как composition roots, переиспользуемые backend/frontend packages вместо копирования и преждевременных микросервисов;
2. PostgreSQL + Redis;
3. Laravel Reverb и модель real-time доставки;
4. лёгкий CQRS без event sourcing;
5. Sanctum cookie-based SPA auth;
6. интерфейс AI-провайдера и политика приватности;
7. Docker Compose как основной self-hosted delivery target;
8. OpenAPI как источник истины для frontend-клиента.

ADR содержит статус, дату, контекст, решение, альтернативы, последствия и критерии пересмотра. Старые ADR не удалять: новое решение supersedes предыдущее.

## 18. Рабочий процесс агента

Перед изменениями:

1. прочитать `CLAUDE.md`, `CLAUDE.md`, `SUMMARY.md`, релевантные feature docs и ADR;
2. изучить существующий код и соседние реализации;
3. сформулировать короткий план и критерии готовности;
4. проверить версии зависимостей и официальную документацию для нестабильных API;
5. обозначить допущения; не выдумывать отсутствующие требования.

При реализации:

1. сделать минимальный вертикальный срез от API до UI;
2. сначала зафиксировать контракт и ошибки;
3. добавить authorization, validation и observability вместе с happy path;
4. написать тесты пропорционально риску;
5. обновить docs, OpenAPI, changelog и summary;
6. не изменять несвязанные файлы и не перезаписывать пользовательские изменения;
7. не добавлять зависимость, слой или сервис без конкретной пользы.

Перед завершением:

1. запустить релевантные тесты, lint, static analysis, typecheck и build;
2. проверить миграции, OpenAPI и generated client;
3. проверить `git diff` на секреты, случайные файлы и лишние изменения;
4. сообщить только фактически выполненное и проверенное;
5. перечислить непроверенное, риски и следующий небольшой шаг.

## 19. Definition of Done

Функция готова, только если:

- выполнены критерии приёмки;
- вход валидируется, действие авторизуется, ошибки имеют контракт;
- нет известных N+1 и очевидных race conditions;
- покрыты happy path, forbidden, invalid input и ключевой failure path;
- real-time событие авторизовано, версионировано и протестировано, если применимо;
- очередь идемпотентна и имеет retry/timeout/failure policy, если применимо;
- обновлены OpenAPI, frontend client и документация;
- лендинг `demo__4.html` актуален для затронутой пользовательской функции и не описывает неподтверждённую возможность как доступную;
- пройдены локальные проверки и CI;
- self-hosted конфигурация не сломана;
- итоговый отчёт отделяет реализованное от запланированного.

## 20. Правило выбора сложности

Если есть два корректных решения, выбирай то, которое:

1. использует стандартные возможности Laravel/React;
2. требует меньше инфраструктуры;
3. легче тестируется и объясняется;
4. сохраняет возможность будущего выделения модуля;
5. не ухудшает безопасность, приватность и восстановление данных.

Начинай с модульного монолита. Выделяй сервис только по измеримым причинам и после ADR.
