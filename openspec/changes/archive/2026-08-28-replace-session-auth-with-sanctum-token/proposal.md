## Why

Браузерная авторизация до сих пор держится на Laravel session: cookie с
Sanctum-токеном (`persist-sanctum-auth-token-cookie`) была задумана как
переживающая перезапуск, но в реальной установке она не доезжает до браузера —
имя `__Host-chat_browser_token` требует атрибута `Secure`, а стек отдаётся по
`http` (`APP_URL: http://localhost`, `SESSION_SECURE_COOKIE=false`). Cookie
отбрасывается браузером, авторизация фактически остаётся сессионной, сессия
истекает через `SESSION_LIFETIME`, и человека раз за разом просят войти заново.
Владелец продукта требует убрать браузерную схему целиком и авторизовать
клиента одним бессрочным Sanctum-токеном.

## What Changes

- `/auth/login` и `/auth/register` возвращают plaintext Sanctum personal access
  token в теле ответа рядом с пользователем. Токен выдаётся **без**
  `expires_at`: он действует, пока его не отозвали.
- SPA хранит токен в `localStorage` и шлёт его заголовком
  `Authorization: Bearer <token>` в каждом запросе к API и в
  `/broadcasting/auth`. Восстановление входа при старте — `GET /me` с этим
  заголовком.
- **BREAKING**: cookie-сессия SPA удаляется. Уходят `statefulApi()`,
  handshake `GET /sanctum/csrf-cookie`, заголовок `X-XSRF-TOKEN`,
  `credentials: 'include'`, `SANCTUM_STATEFUL_DOMAINS`, регенерация и
  инвалидация session в `/auth/*`. `web`-группа остаётся только у
  Horizon-дашборда, к контракту чата отношения не имеет.
- **BREAKING**: удаляется вся обвязка browser-token cookie:
  `BrowserTokenConfig`, `BrowserTokenLifecycle`, `BrowserTokenCookieData`,
  middleware `UseBrowserTokenCookie`, секция `identity.browser_token` и
  переменные `AUTH_BROWSER_TOKEN_*`. Маршруты identity переходят на общий
  `auth:sanctum`, как остальные пакеты.
- **BREAKING**: поле `remember` уходит из `/auth/login`, `LoginRequest`,
  `LoginCommand` и формы входа — бессрочный токен делает его бессмысленным.
- Файлы, которые браузер грузит сам (`<img src>`: аватарки, фото комнат,
  миниатюры и оригиналы вложений), переводятся на авторизованный `fetch` с
  Bearer-токеном и показ через `blob:`-URL — новый общий компонент в
  `@vendor/ui`. Адреса не меняются, поэтому кеш изображений service worker'а
  продолжает работать.
- **BREAKING**: экран «Сессия истекла» и «тихое восстановление» через
  CSRF-handshake удаляются. 401 после входа означает отозванный токен: клиент
  стирает токен, гасит сокет и уводит на `/login`; глушение повторов, чтобы
  экран не мигал, остаётся.
- Отзыв: выход отзывает только токен текущего устройства; сброс пароля отзывает
  все токены человека; смена пароля в настройках отзывает все, кроме текущего.
- Push-подписка из service worker'а (`pushsubscriptionchange`) перестаёт читать
  XSRF-cookie и отправляется с Bearer-токеном.
- ADR-005 (Sanctum cookie SPA) переводится в `superseded` новым ADR-012 о
  token-авторизации: решение и его последствия для XSS фиксируются явно.

## Capabilities

### New Capabilities

- `identity/token-authentication`: выдача, хранение, применение и отзыв
  бессрочного Sanctum-токена как единственного способа авторизации клиента;
  доставка защищённых файлов и поведение при 401.

### Modified Capabilities

Нет: каталог `openspec/specs` пуст, канонических capability в репозитории ещё
нет. Прежние контракты зафиксированы в change'ах
`persist-sanctum-auth-token-cookie` и `fix-auth-401-session-expiry-loop`;
настоящий change отменяет оба и описывает контракт заново.

## Impact

- `packages/backend/identity`: `LoginHandler`, `RegisterUserHandler`,
  `LogoutHandler`, `ChangePasswordHandler`, `ResetPasswordHandler`,
  `AuthController`, `LoginRequest`, `AuthenticatedUserData`, маршруты,
  `config/identity.php`, удаление четырёх классов browser-token, OpenAPI и
  тесты пакета.
- `apps/chat-api`: `bootstrap/app.php` (`statefulApi()`),
  `config/sanctum.php`, `config/cors.php`, `BroadcastServiceProvider`
  (`/broadcasting/auth` без `web`), integration-тесты.
- `packages/frontend/api-client`: `ApiClient` — Bearer-заголовок вместо cookie
  и CSRF, удаление handshake и `refreshCsrfCookie()`.
- `packages/frontend/identity`: `useAuth`, `identityApi`, схемы форм,
  `LoginForm`; хранилище токена.
- `packages/frontend/ui` и `packages/frontend/chat`: авторизованная загрузка
  изображений (`Avatar`, `RoomGlyph`, `AttachmentTiles`, `AttachmentGallery`,
  `AvatarPicker`, `MentionPicker`, `MemberRow`).
- `apps/chat-web`: `api.ts`, `session.ts`, `auth.tsx`, `echo.ts`,
  `image-prewarm.ts`, `public/sw.js`, удаление `SessionExpiredScreen.tsx`;
  E2E `auth.spec.ts` и сценарии, где проверялась живучесть сессии.
- Конфигурация установки: `.env.example`, `docker-compose.yml` — уходят
  `SANCTUM_STATEFUL_DOMAINS`, `SESSION_SECURE_COOKIE`, `AUTH_BROWSER_TOKEN_*`.
- Документация: ADR-005 → `superseded`, новый ADR-012,
  `docs/features/authentication.md`, `docs/security/threat-model.md`,
  `docs/operations/upgrade.md`, `README.md`, `CHANGELOG.md`, `SUMMARY.md`,
  секция авторизации в `demo.html`.
- Обновление: у всех уже вошедших людей вход обнуляется один раз — cookie-сессии
  больше не признаются, нужен повторный ввод логина и пароля. Новых сервисов и
  зависимостей не появляется, таблица `personal_access_tokens` уже есть.
