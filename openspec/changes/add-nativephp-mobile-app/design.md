## Context

Мотивация описана в `proposal.md`; поведенческий контракт — в четырёх delta-
spec этого change.

Текущее приложение уже разделено на `apps/chat-api` (Laravel 13) и
`apps/chat-web` (React/Vite), а продуктовые возможности находятся в backend и
frontend packages. Web-клиент использует Sanctum cookie + CSRF, относительный
HTTP origin, Laravel Echo/Reverb, service worker и VAPID Web Push. Эти
допущения нельзя перенести в локальный mobile WebView без отдельного auth и
platform boundary.

NativePHP Mobile 4.x сейчас предоставляет подходящие для переноса примитивы:

- upstream рекомендует устанавливать `nativephp/mobile` в отдельное Laravel-
  приложение, а не в серверный API composition root;
- полноэкранный PHP-mode WebView является first-class способом разместить
  существующий React/Vite UI и получить `window.Native` bridge;
- Firebase plugin предоставляет Android FCM, iOS APNs через FCM, permission
  flow, token events, JavaScript API и deep links;
- SecureStorage plugin предоставляет iOS Keychain и Android Keystore-backed
  storage;
- Laravel/PHP-код mobile application входит в APK/AAB/IPA и считается
  публичным, поэтому серверные пакеты и секреты в mobile root не включаются.

Проверенная upstream база: [installation](https://nativephp.com/docs/mobile/4/getting-started/installation),
[WebView](https://nativephp.com/docs/mobile/4/edge-components/web-view),
[Firebase plugin](https://nativephp.com/plugins/nativephp/mobile-firebase),
[SecureStorage plugin](https://nativephp.com/plugins/nativephp/mobile-secure-storage),
[security](https://nativephp.com/docs/mobile/4/digging-deeper/security) и
[publishing](https://nativephp.com/docs/mobile/4/publishing/introduction).

Native push неизбежно использует FCM/APNs. Чтобы сохранить self-hosted модель
без vendor relay, Firebase project, service account и подписанные приложения
принадлежат оператору конкретной установки. Поэтому один binary в этой версии
обслуживает один заранее настроенный сервер.

## Goals / Non-Goals

**Goals:**

- добавить thin NativePHP composition root, не перенося в устройство backend-
  домены, БД сервера или secrets;
- сохранить одну React-реализацию продуктовых экранов и разделить только
  platform adapters;
- добавить безопасный Bearer auth с refresh rotation для мобильного клиента;
- встроить FCM/APNs в существующие notification rules и очереди рядом с Web
  Push, не связывая два транспорта общим failure domain;
- сделать Android/iOS release воспроизводимым и проверяемым на реальных
  устройствах;
- оставить PWA и Docker Compose runtime работоспособными без mobile/Firebase
  конфигурации.

**Non-Goals:**

- не переписывать React UI screen-by-screen на EDGE/SwiftUI/Jetpack Compose;
- не переносить серверные данные в локальную SQLite и не делать offline-first
  историю или очередь исходящих сообщений;
- не добавлять универсальный выбор произвольного self-hosted сервера;
- не вводить центральный notification relay, Bifrost как обязательный build
  service или второй deployable backend;
- не заменять Web Push, cookie auth или Reverb существующей PWA;
- не добавлять local notifications, background data synchronization или
  silent push сверх необходимого visible notification flow.

## Decisions

### 1. Отдельный `apps/chat-mobile`, а не NativePHP внутри `chat-api`

Добавляется самостоятельный Laravel 13 composition root:

```text
apps/chat-mobile/
├── app/                         # только mobile shell и platform coordination
├── bootstrap/
├── config/nativephp.php
├── public/                      # собранные React assets
├── resources/
│   ├── js/                      # native platform adapter/bootstrap
│   └── views/                   # full-screen PHP-mode WebView screen
├── routes/{mobile,web}.php
├── tests/
├── composer.json
├── package.json
└── vite.config.ts
```

В mobile root устанавливаются Laravel, `nativephp/mobile` 4.x,
`nativephp/mobile-firebase` и `nativephp/mobile-secure-storage`. Серверные
`vendor/identity`, `vendor/chat`, `vendor/notifications`, `vendor/ai` и
`vendor/administration` туда не подключаются: клиент обращается к ним только
через собранный OpenAPI-контракт удалённого `chat-api`.

`nativephp/` рассматривается как ephemeral output `native:install --force` и
игнорируется git. Коммитятся только Laravel source, NativePHP config, plugin
registration и тестируемые build scripts.

Альтернатива — установить NativePHP в `apps/chat-api`. Она отвергнута, потому
что упакует серверные пакеты и конфигурацию в пользовательский binary, смешает
remote source of truth с локальным runtime и увеличит blast radius обновлений.

### 2. NativePHP v4 shell использует полноэкранный PHP-mode WebView

Первый native route рендерит один полноэкранный PHP-mode WebView с локальным
React entrypoint. Это официальный v4 compatibility path для существующего
React/Vite UI: JavaScript и DOM storage доступны, а `#nativephp`/`window.Native`
bridge используется только платформенными адаптерами.

Внешний URL сервера никогда не загружается как привилегированный WebView.
Локальный Laravel route отдаёт только bundled SPA assets; HTTP API и Reverb
остаются удалёнными HTTPS/WSS соединениями. External links уходят в системный
browser adapter и не получают bridge.

Полная EDGE-переработка отклонена: она создаст вторую UI-реализацию всех
экранов, сорвёт требование паритетности и не даст дополнительной ценности для
первого mobile release. В дальнейшем отдельные chrome/OS-heavy элементы можно
переносить в EDGE за platform interface без изменения domain packages.

### 3. Продуктовый React shell выделяется в переиспользуемый package

Из `apps/chat-web` выделяется `packages/frontend/app-shell` с router/page
composition, providers и общими lifecycle actions. Он не импортирует код из
`apps/*` и принимает типизированный `PlatformAdapter`:

```text
React feature packages
        │
        ▼
@vendor/app-shell
        │
        ├── WebPlatformAdapter ─── cookie/CSRF, SW, VAPID, browser links
        └── MobilePlatformAdapter ─ Bearer, SecureStorage, FCM, native links
```

Минимальные adapter boundaries:

- `RuntimeConfigAdapter` — API/WSS/public branding configuration;
- `AuthStrategy` — подготовка request headers, refresh, logout cleanup;
- `RealtimeStrategy` — endpoint и auth headers для private/presence channels;
- `PushAdapter` — permission/status/register/unregister;
- `LifecycleAdapter` — resume/background/network events;
- `LinkAdapter` — internal route, invite/deep link и external browser;
- `UpdateAdapter` — PWA service-worker update или native store-required state.

`@vendor/api-client` получает асинхронную auth strategy вместо жёстких
`credentials: include` и CSRF. Web strategy полностью сохраняет текущий путь;
mobile strategy добавляет `Authorization: Bearer ...`. После 401 выполняется
один сериализованный refresh. Автоматический повтор разрешён только для GET/
HEAD или мутации с `Idempotency-Key`; остальные мутации показывают безопасную
ошибку вместо возможного дубля.

Native-only imports из `#nativephp` находятся в `apps/chat-mobile`, поэтому
web build не требует mobile plugins. Service worker регистрируется только web
adapter. Query cache очищается при logout/revocation, а server state не
дублируется в native Laravel runtime.

Прямой import `apps/chat-web` из mobile app отклонён: он нарушит composition-
root boundary и сохранит browser-only допущения. Копирование страниц также
отклонено из-за неизбежного дрейфа.

### 4. Существующий Laravel Echo остаётся real-time клиентом WebView

React UI продолжает использовать `laravel-echo`/`pusher-js` и существующий
`RealtimeAdapter`; NativePHP Vibe plugin не нужен для первой версии. После
resume Echo переподключается, а feature hooks выполняют уже существующий HTTP
resync. В background соединение можно закрывать, потому что видимые события
доставляет native push, а HTTP остаётся источником истины.

Для mobile добавляется `/api/v1/broadcasting/auth` под `api` +
`auth:sanctum`, принимающий Bearer token и использующий те же channel callbacks
и room policies. Текущий `/broadcasting/auth` под web/session/CSRF остаётся для
PWA. Mobile Echo использует custom authorizer, который добавляет Bearer header;
app secret на устройство не попадает.

Vibe отвергнут на этом этапе: он полезен для EDGE/PHP screens, но при React
WebView создаст второй WebSocket client и потребует вторую обработку тех же
event schemas.

### 5. Один build подключается к одному серверу оператора

Mobile release получает только публичный allowlist конфигурации:

- application/bundle id, display name, version и build number;
- HTTPS API base URL и WSS endpoint/public Reverb app key;
- deep-link scheme/verified host;
- public Firebase platform files;
- branding и безопасные feature flags.

`config/nativephp.php` удаляет остальные environment keys из bundle. URLs
валидируются build preflight: production допускает только HTTPS/WSS, кроме
явного debug profile для emulator/local development. Certificate validation
не отключается.

Каждая self-hosted установка использует собственный Firebase project:
mobile platform files входят в её build, а service-account JSON находится
только на её `chat-api`. Это позволяет серверу отправлять FCM напрямую и не
создаёт vendor control plane.

Универсальный binary потребовал бы общий Firebase sender identity и
центральный relay либо небезопасную раздачу одного service account всем
операторам. Он отклонён и может появиться только отдельным ADR/spec.

### 6. Mobile auth — opaque access/refresh session поверх Sanctum

Добавляются endpoints:

```text
POST /api/v1/auth/mobile/register
POST /api/v1/auth/mobile/login
POST /api/v1/auth/mobile/refresh
POST /api/v1/auth/mobile/logout
```

Новые transport Data-классы используют `spatie/laravel-data`; контроллеры
только преобразуют Data → Command → result Data. Identity Application handlers
проверяют credentials, открывают/ротируют/отзывают сессию в транзакции.

Access token — Sanctum personal access token с ability `mobile`, явным
`expires_at` (default 24 часа, hard maximum 48 часов) и ссылкой на mobile
session. Policies и membership остаются обязательными; ability не заменяет
авторизацию домена.

Refresh token — opaque значение вида `<session-ulid>.<random-secret>`. В БД
хранится только SHA-256/HMAC hash secret. Такая форма позволяет найти session
по публичному ULID и распознать replay старого secret после rotation.

Новая таблица пакета identity:

```text
mobile_sessions
- id ULID primary
- user_id indexed
- installation_id UUID/string indexed
- access_token_id nullable indexed
- refresh_token_hash char(64)
- refresh_expires_at timestamp
- rotation integer
- last_used_at timestamp nullable
- revoked_at timestamp nullable
- created_at / updated_at
unique (user_id, installation_id) for active lifecycle enforced by handler/lock
```

Refresh handler выполняет `lockForUpdate()`, constant-time hash comparison,
проверку expiry/revocation, отзывает старый access token, меняет hash/rotation
и выдаёт новую пару одной транзакцией. Hash mismatch при известном session id
считается replay и отзывает session. Параллельные refresh дают один success.

Mobile register переиспользует существующий user registration use case и
открывает session после успешного создания. Logout идемпотентно отзывает пару.
Password change/reset и admin security reset отзывают все mobile sessions.
После commit composition-root orchestration получает публичное событие
`MobileSessionRevoked`/`AllMobileSessionsRevoked` и деактивирует связанные
native push registrations без прямого доступа identity к notification table.

Access/refresh tokens и installation id сохраняются через SecureStorage
(installation id не секрет, но тот же adapter даёт устойчивый lifecycle).
Tokens не попадают в React state дольше выполнения запроса, query cache,
browser storage или лог. При недоступном secure storage persistent login
запрещён.

Бессрочный Sanctum token без refresh отклонён из-за большой компрометационной
зоны; Passport/OAuth2 отклонён для первого first-party client как более
тяжёлая инфраструктура. Решение оформляется новым ADR, который дополняет
ADR-005: cookie auth остаётся предпочтительным для browser, Bearer — только
для native client.

### 7. Native device registration отделена от Web Push subscription

Web Push `push_subscriptions` остаётся без изменения формата. Native tokens
имеют другой lifecycle и хранятся в новой таблице notification package:

```text
native_push_devices
- id ULID primary
- user_id indexed
- installation_id UUID/string unique
- platform enum(android, ios)
- token encrypted text
- token_hash char(64) unique
- app_version string
- last_registered_at timestamp
- disabled_at timestamp nullable
- created_at / updated_at
```

Token шифруется Laravel encrypted cast, а hash используется для уникальности
и поиска без plaintext. Hardware identifiers, advertising id и полный device
fingerprint не собираются.

Authenticated API:

```text
PUT    /api/v1/native-push/devices/{installationId}
DELETE /api/v1/native-push/devices/{installationId}
```

`PUT` идемпотентно создаёт/перепривязывает installation текущему пользователю
и атомарно заменяет token после FCM rotation; ответ не содержит token. `DELETE`
идемпотентно деактивирует только registration текущего пользователя. Data,
Command/Handler и Resources следуют package DDD/CQRS-lite rules.

Client push adapter сначала показывает продуктовый pre-prompt, затем вызывает
native system permission. Он слушает token-generated event, выполняет `PUT`,
повторяет reconciliation на resume и показывает `on` только после server ack.
Logout сначала делает best-effort DELETE, но серверный revoke event является
надёжным fallback.

Расширять `push_subscriptions` nullable колонками token/platform отклонено:
Web Push endpoint+keys и FCM token имеют разные инварианты, rotation и ошибки;
общая таблица усложнит уникальность и миграцию работающего PWA.

### 8. Один logical push channel, независимые transport jobs

`Channel::Push` и существующие пользовательские предпочтения сохраняются.
Когда push разрешён, application handler создаёт независимые delivery jobs для
`web_push` и `native_push`; unique id включает logical notification id и
transport. Оба используют очередь категории (`notifications`, critical/bulk
по действующей политике), но имеют независимые retries/failures.

```text
NotifyRoomEventHandler
        │ rules/preferences/grouping
        ├── database
        ├── mail job
        ├── web-push job ─── VAPID sender ─── browser push service
        └── native job ───── FCM sender ───── FCM ───── APNs on iOS
```

Так временная ошибка FCM не переотправляет уже успешный Web Push и наоборот.
Каждый sender обходит все регистрации, удаляет/деактивирует окончательно
невалидные и поднимает временную ошибку после попыток остальных устройств.
`failed()` пишет audit-safe transport/error class без token и message body.

FCM sender находится в Infrastructure notification package за
`NativePushTransport` contract. Он использует FCM HTTP v1 и OAuth service-
account credentials из config path. Access token FCM кэшируется в Redis/
Laravel Cache с expiry, а не в mutable static/singleton state, что сохраняет
Octane safety. Конкретная Google auth dependency проверяется по актуальным
версиям на apply; native Firebase plugin в server API не устанавливается.

Visible payload строится тем же formatter policy, что Web Push: title,
обрезанный preview, category, относительный `/rooms/{id}`, collapse key/tag и
badge. Android collapse key и APNs collapse-id используют category+room.
FCM permanent errors (`UNREGISTERED`, token-specific invalid argument) отключают
registration; auth/quota/5xx/timeout считаются временными согласно официальной
матрице ошибок.

Существующая `chat:push-test` расширяется выбором `web|native|all` и выводит
только counts/redacted diagnostics. Native transport выключен, пока server
credentials не валидны; это не отключает Web Push.

### 9. Deep links проходят через allowlisted route coordinator

Push payload и verified links несут только относительный route. Native shell
преобразует allowlisted `/rooms/*`, `/invite/*`, `/notifications` и auth routes
во внутреннюю React navigation. Неизвестный route приводит к safe not-found;
абсолютный URL из push отклоняется.

Cold start сохраняет pending route до загрузки secure session и `/me`; затем
route открывается через обычные guards. Warm/background tap передаётся в уже
живой WebView без создания второго React root. Invite token переживает переход
через login/register так же, как в PWA.

React router получает mobile basename/fallback route, чтобы локальный Laravel
runtime отдавал SPA index на внутренние маршруты. Точный NativePHP route shape
покрывается cold/warm component tests и выбирается без изменения публичных URL
чата.

### 10. Resume, network и safe-area координируются platform adapter

Mobile lifecycle adapter:

1. на background приостанавливает Echo/typing timers и не начинает новые
   мутации;
2. на resume читает secure session, заранее refresh-ит истекающий access token,
   сверяет native push token/server registration;
3. переподключает Echo и invalidates active room/rooms/notifications queries;
4. очищает badge после открытия актуальной ленты/комнаты;
5. при offline оставляет bundled shell доступной, но показывает честный
   reconnect state без локальной отправки.

NativePHP `--inset-*` variables и keyboard visibility маппятся на существующие
app-shell CSS tokens (`--app-bottom-inset` и viewport rules). Не отключается
user zoom глобально, если это нарушает accessibility; защита от accidental
zoom/selection остаётся scoped как в текущих app-shell changes.

### 11. Mobile/server compatibility проверяется явно

Mobile adapter передаёт `X-Chat-Mobile-Version` и platform на API requests.
Composition root публикует bootstrap compatibility/config endpoint и
configurable minimum supported mobile version. Для слишком старого клиента
API возвращает `426` с обычным error envelope и code
`mobile_upgrade_required`; auth/bootstrap endpoint остаётся способен объяснить
обновление. Версия сравнивается как SemVer, build number используется только
stores.

Это не заменяет `/api/v1` versioning: additive изменения остаются backward-
compatible, а bump minimum client допускается только с release notes и
upgrade path.

### 12. Release pipeline отделён от обычного self-hosted runtime

Добавляются `./tools/chat mobile ...` команды-обёртки для install/preflight,
assets, test, run, package и verify. Они работают из `apps/chat-mobile` и не
делают NativePHP/Xcode/Android SDK зависимостями `docker compose up`.

Initial dependency constraints фиксируются mobile Composer lock (целевой
NativePHP 4.2 line после успешного resolution). Premium plugin repository
credentials поступают только во время Composer install. Реальные
`google-services.json`, `GoogleService-Info.plist`, service account, keystore и
Apple keys игнорируются git и материализуются из secret storage во временный
build workspace.

PR gate без secrets выполняет PHP/TS tests, OpenAPI/client generation,
app-shell web regressions, NativePHP bridge fakes и unsigned/debug native
compile там, где runner доступен. Protected release gate создаёт Android
AAB/APK и iOS IPA, checksums/SBOM, проверяет bundle на secrets и сохраняет
provenance. iOS packaging выполняется на поддерживаемом macOS/Xcode runner;
Android — на документированном Android SDK/JDK runner.

Simulator/emulator доказывают UI/lifecycle, но visible push, cold-start tap и
lock-screen delivery отмечаются verified только после физического Android и
iPhone. `SUMMARY.md` хранит честную матрицу устройства/даты результата.

## Risks / Trade-offs

- [NativePHP Mobile 4.x и plugin API быстро меняются] → pin minor line и lock-
  файлы, проверять upstream changelog перед update, пересоздавать `nativephp/`,
  держать bridge adapters малыми и гонять обе платформы.
- [React в WebView не равен full EDGE-native UI] → это осознанный parity-first
  этап; системные auth storage, push, lifecycle и deep links уже native, а EDGE
  migration возможна по одному adapter/screen после измерения пользы.
- [Premium plugin/license credentials могут отсутствовать] → первым apply-
  gate проверить доступ к core/plugins без коммита credentials; при отсутствии
  implementation останавливается до предоставления доступа, PWA не меняется.
- [Один binary на одну установку усложняет публикацию многих self-hosted
  серверов] → документировать per-install branding/build; universal client
  требует отдельного ADR и relay/security model.
- [FCM является внешней зависимостью] → direct operator-owned project, bounded
  retries, диагностика, Web Push/database/mail остаются независимыми.
- [Refresh rotation создаёт race на плохой сети] → row lock, один in-flight
  refresh в client, session-family replay detection и idempotent logout.
- [Logout без сети может оставить push token на сервере] → session revoke
  event деактивирует installation server-side; expired/revoked session не
  может перепривязать token.
- [Отдельные transport jobs могут отправить push на несколько устройств] → это
  ожидаемый fan-out; uniqueness transport+notification и platform collapse key
  предотвращают технические дубли.
- [Содержимое видно на lock screen] → общий короткий preview policy, настройка
  push по категориям и явное предупреждение пользователю; секреты/полный текст
  не включаются.
- [Native WebView отличается по версиям Android] → зафиксировать conservative
  minimum OS matrix по реальным constraints plugins и тестировать минимальный
  emulator, Tailwind 3 сохраняется до отдельной совместимой миграции.
- [Старая mobile версия после server change] → additive `/api/v1`, явный
  supported range и 426 upgrade envelope вместо случайных runtime errors.

## Migration Plan

1. Оформить ADR о mobile composition root/auth/Firebase и подтвердить доступ к
   NativePHP 4.x и premium plugins без изменения production.
2. Добавить backward-compatible server foundation: identity mobile sessions,
   Bearer broadcast auth, native device API/table, FCM transport behind disabled
   config, OpenAPI/generated client и тесты. Применить forward migrations;
   PWA продолжает использовать прежние endpoints.
3. Выделить `@vendor/app-shell` и platform interfaces, сначала подключить к ним
   `chat-web`; пройти полный web CI/E2E до создания mobile adapter.
4. Создать `apps/chat-mobile`, подключить NativePHP/WebView/SecureStorage,
   mobile auth/realtime/lifecycle/deep links; проверить debug Android/iOS без
   push.
5. Настроить operator Firebase apps/service account, подключить native push,
   команды диагностики и проверить token rotation/failure paths.
6. Добавить signed build pipeline, runbooks и полный emulator/simulator gate;
   затем выполнить физическую Android/iPhone матрицу.
7. Сначала развернуть совместимый server release, затем опубликовать mobile
   clients. Включить FCM config только после успешного test push.

Rollback не удаляет forward migrations и не откатывает public API. При проблеме
оператор выключает mobile auth/native push config, отзывает mobile sessions и
registrations и снимает mobile release с распространения; PWA/Web Push
продолжают работать. Возврат старого server image допустим только пока mobile
client ещё не выпущен, иначе он потеряет свой контракт.

## Open Questions

- Конкретные production application/bundle id, display name, store accounts и
  URLs задаёт оператор перед первым release; дизайн и tasks используют
  обязательные environment placeholders.
- Apply требует действующего доступа к `nativephp/mobile` и premium Firebase/
  SecureStorage plugins. Способ iOS signing (локальный macOS runner или
  разрешённый remote builder) выбирается оператором без изменения контрактов.
