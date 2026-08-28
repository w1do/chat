## Why

Текущая браузерная авторизация зависит от Laravel session: при потере или
пересоздании сессии пользователь получает `401`, чат очищает состояние и снова
требует логин и пароль. Вход должен переживать перезапуск браузера и серверной
сессии, а текущий пользователь должен восстанавливаться через защищённый
Sanctum-токен без доступа JavaScript к credential.

## What Changes

- После успешных `/auth/login` и `/auth/register` backend создаёт отдельный
  Sanctum personal access token для браузерной сессии и устанавливает его
  plaintext-значение только в `HttpOnly`, `Secure`, `SameSite` cookie; токен не
  возвращается в JSON и не попадает в `localStorage`/`sessionStorage`.
- `auth:sanctum` получает token из этой cookie, когда stateful session не
  авторизовала запрос; `/me` остаётся единственным источником восстановления
  пользователя при старте и после перезагрузки чата.
- Cookie и token имеют согласованный конечный срок жизни; обычный вход
  сохраняется на короткий настраиваемый период после закрытия браузера, а флаг
  «Запомнить меня» выбирает более долгий срок.
- Logout атомарно отзывает текущий browser token, инвалидирует прежнюю Laravel
  session и удаляет cookie. Смена/сброс пароля и административный reset отзывают
  все browser tokens пользователя.
- Cookie-authenticated мутации сохраняют CSRF-защиту и origin allowlist;
  наличие `HttpOnly` cookie не превращает запрос в доверенный без проверки CSRF.
- Клиент продолжает отправлять `credentials: include`, при запуске запрашивает
  `/me`, очищает приватный cache только после подтверждённого `401` и не читает
  token напрямую.
- Добавляются проверки перезапуска браузера, потери Laravel session, истечения и
  отзыва token, logout, CSRF, CORS, параллельных сессий и отсутствия credential
  в JSON/логах/доступных JavaScript cookie.
- **BREAKING**: browser-аутентификация перестаёт полагаться только на механизм,
  принятый ADR-005; ADR пересматривается с описанием token-cookie fallback,
  модели угроз, срока жизни и процедуры отката.

## Capabilities

### New Capabilities

- `identity/browser-token-authentication`: долговечная браузерная Sanctum-сессия
  в защищённой cookie, восстановление пользователя через `/me`, отзыв и
  требования CSRF/XSS-защиты.

### Modified Capabilities

Нет: каталог канонических `openspec/specs` пока пуст; существующее поведение
аутентификации зафиксировано в завершённом change, поэтому новый контракт
описывается отдельной capability.

## Impact

- `packages/backend/identity`: login/register/logout handlers, browser token
  lifecycle, cookie issuance/removal, password security operations, OpenAPI и
  package tests.
- `apps/chat-api`: Sanctum guard/middleware wiring, cookie/session/config,
  CORS/CSRF, Octane-safe request handling и integration tests.
- `packages/frontend/api-client` и `packages/frontend/identity`: startup `/me`,
  обработка `401/419`, cache cleanup и component tests без хранения token в JS.
- Контракт ответов login/register и `/me` остаётся совместимым: token не
  добавляется в response body; меняются только `Set-Cookie` и серверный способ
  определения пользователя.
- Обновляются OpenAPI/generated client, ADR-005 либо superseding ADR,
  `docs/features/authentication.md`, threat model, upgrade notes, `CHANGELOG.md`,
  `SUMMARY.md` и подтверждённая секция авторизации в `demo__4.html`.
- Новых runtime-сервисов и внешних зависимостей не требуется; используется
  существующая таблица Sanctum `personal_access_tokens`.