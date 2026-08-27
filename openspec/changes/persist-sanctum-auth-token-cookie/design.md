## Context

См. `proposal.md` — Why. Сейчас `LoginHandler` выполняет `web` guard attempt,
контроллер регенерирует Laravel session, а frontend уже отправляет
`credentials: include` и при старте вызывает `/me`. Все identity routes
защищены `auth:sanctum`; таблица `personal_access_tokens` уже существует.

ADR-005 выбирает stateful cookie-session и отвергает browser Bearer token из-за
риска хранения в JavaScript. Новый контракт не хранит token в JavaScript, но
всё равно меняет security boundary: автоматически приложенная token cookie
требует такой же CSRF-защиты, как session cookie.

## Goals / Non-Goals

**Goals:**

- переживать потерю Laravel session и закрытие браузера в пределах срока token;
- сохранить существующие URL и user envelope login/register/`/me`;
- обеспечить отзыв отдельных браузеров и глобальный отзыв при смене credentials;
- исключить request state из singleton/static memory под Octane;
- сохранить CSRF, CORS/origin и policy проверки для всех cookie-запросов.

**Non-Goals:**

- не отдавать browser token JavaScript и не добавлять token в response body;
- не заменять отдельный mobile access/refresh flow из
  `add-nativephp-mobile-app`;
- не вводить JWT, refresh token для браузера или внешнее хранилище сессий;
- не маскировать ошибку конфигурации cookie бесконечным retry на frontend;
- не менять доменные права, payload `/me` или правила Reverb channels.

## Decisions

### 1. Sanctum PAT хранится в host-only HttpOnly cookie

Login/register создают token с отдельной ability, например `browser`, и
обязательным `expires_at`. Plaintext существует только во время формирования
ответа и сразу помещается в cookie; в БД остаётся штатный hash Sanctum.

Production cookie получает имя с префиксом `__Host-`, `Secure`, `HttpOnly`,
`SameSite=Lax`, `Path=/` и без `Domain`. Имя, secure-флаг и сроки задаются
package config/environment для HTTPS production и HTTP local development, но
production validation запрещает небезопасную комбинацию. Это безопаснее
localStorage и не требует нового crypto/storage слоя.

Альтернатива — исправить только lifetime Redis/database session. Она проще и
остаётся предпочтительной при найденной конфигурационной ошибке, но не
выполняет явный token-cookie контракт и не даёт per-browser Sanctum revocation.
Перед реализацией reproduction test обязан доказать, что дефект действительно
сохраняется при корректной session конфигурации.

### 2. Cookie извлекается только внутри browser-auth middleware

Отдельный scoped/request middleware после stateful frontend/CSRF проверки и до
`auth:sanctum` читает только конкретную HttpOnly cookie. Если Authorization
header отсутствует, middleware передаёт token Sanctum guard как credential
текущего запроса; token никогда не записывается в глобальный request factory,
config или singleton.

Если session и cookie определяют разных пользователей, запрос отклоняется и
cookie удаляется: молчаливый приоритет создал бы confused-deputy риск. Явный
Bearer header не копируется в cookie и не получает browser lifetime.

Альтернатива — изменять глобальный Sanctum guard. Она увеличивает влияние на
mobile/integration Bearer flows и усложняет обновления пакета, поэтому
предпочтён локальный middleware composition root.

### 3. Token cookie остаётся cookie-auth и не обходит CSRF

Поскольку браузер прикладывает cookie автоматически, middleware принимает её
только для запросов, прошедших stateful-origin pipeline Sanctum. Мутации должны
пройти штатную проверку пары `XSRF-TOKEN`/`X-XSRF-TOKEN`; CORS продолжает
разрешать credentials только явному allowlist.

Middleware ordering фиксируется integration test: token extraction происходит
после CSRF validation и до authentication. SameSite — дополнительная защита,
не замена CSRF. Альтернатива с Bearer-семантикой cookie отвергнута как CSRF
уязвимая.

### 4. Обычный и remembered login отличаются только expiration

Оба варианта получают persistent cookie, чтобы обычный login переживал закрытие
браузера. Начальные defaults: 24 часа для обычного входа и 30 дней для
`remember=true`; оба значения конфигурируются, отражаются одновременно в
`expires_at` token и `Max-Age` cookie и документируются в `.env.example`.
Серверный expiration является источником истины.

Refresh token не нужен: по истечении пользователь входит снова. Это сокращает
поверхность replay/rotation по сравнению с mobile flow.

### 5. Отзыв привязан к конкретному token, security events — ко всем browser token

Текущий access token доступен через Sanctum authentication result, поэтому
logout удаляет только его, затем инвалидирует session и ставит expired cookie.
Если logout повторён без token, он всё равно очищает cookie и возвращает
идемпотентный `204`.

Смена/сброс пароля и admin password reset удаляют все tokens с browser ability;
mobile/API tokens не затрагиваются без отдельной политики. Cleanup истёкших
PAT выполняется штатной scheduled-командой Sanctum с документированным запасом.

### 6. Frontend уже имеет нужный bootstrap, меняется только подтверждение 401

`useAuth` сохраняет `/me` как источник истины, а `ApiClient` продолжает
`credentials: include` и CSRF handshake. Login/register кладут возвращённого
user в Query cache, но reload всегда подтверждает его через `/me`.

При `401` auth state очищается один раз вместе с приватными query caches и Echo
subscriptions. `419` повторяет только CSRF handshake один раз; browser token не
читается и не обновляется клиентом. Бесконечного retry или fallback в web
storage нет.

### 7. Контракт и документация меняются вместе с security решением

OpenAPI описывает `Set-Cookie` семантику без публикации token schema. ADR-005
supersedes новый ADR либо получает явную accepted revision только после
security review; предпочтителен новый ADR, поскольку меняется отвергнутая ранее
альтернатива. Документация объясняет сроки, logout и обязательный HTTPS.

`demo__4.html` обновляется только после реализации и прохождения тестов, чтобы
не заявлять planned поведение как доступное.

## Risks / Trade-offs

- [XSS не может прочитать cookie, но может отправлять запросы от лица человека]
  → `HttpOnly`, CSP/security headers, CSRF и короткий default lifetime.
- [CSRF bypass из-за ошибочного middleware ordering] → integration tests на
  cross-origin mutation и фиксация порядка в composition root.
- [Утечка identity между Octane requests] → только request-local middleware и
  последовательные multi-user tests под FrankenPHP.
- [Token остаётся в БД после исчезновения cookie] → конечный `expires_at` и
  scheduled prune; logout отзывает немедленно.
- [Две auth-схемы усложняют диагностику] → конфликт session/token отклоняется,
  trace/audit пишет только token id и причину, никогда plaintext.
- [Cookie не установится за reverse proxy или на HTTP] → production readiness
  проверяет HTTPS/secure config, документация задаёт trusted proxies и локальное
  исключение только для development.
- [Причина дефекта — неверная session config, а не архитектурный недостаток] →
  первым шагом воспроизводящий тест; если корректная stateful session решает
  проблему, изменение останавливается и архитектурное решение пересматривается.

## Migration Plan

1. Добавить failing integration/E2E reproduction: login, закрытие контекста или
   удаление Laravel session, новый контекст с cookie, `/me` без повторного входа.
2. Добавить config и browser-token lifecycle за feature flag, затем package,
   API, Octane, CSRF/CORS и frontend tests.
3. Обновить OpenAPI/client, ADR, security/feature/operations docs и environment
   examples; проверить upgrade с существующей session cookie.
4. Выпустить backend раньше или одновременно с frontend. Существующие session
   users продолжают работать; новый token появляется при следующем login или
   register, принудительная миграция plaintext невозможна и не нужна.
5. После проверки включить feature по умолчанию, прогнать critical E2E и smoke
   под production-like HTTPS proxy, затем обновить summary/changelog/landing.

Rollback: выключить token-cookie middleware и issuance, истечь cookie тем же
именем, массово удалить только browser-ability tokens и вернуть session-only
режим. Existing Laravel sessions и mobile/API tokens не затрагиваются.

## Open Questions

Нет.