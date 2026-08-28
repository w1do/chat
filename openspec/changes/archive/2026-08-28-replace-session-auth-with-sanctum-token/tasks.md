## 1. Backend: выдача токена и вход без сессии

- [x] 1.1 `LoginHandler` проверяет учётные данные через `UserProvider` (`retrieveByCredentials` + `validateCredentials`) вместо `StatefulGuard::attempt()` и возвращает пользователя без создания сессии; проверить тестом пакета, что после успешного входа сессия не стартует, а неверный пароль по-прежнему даёт `AuthenticationException`
- [x] 1.2 `LoginHandler` и `RegisterUserHandler` выдают `createToken('client', ['*'])` без `expires_at`; проверить тестом, что в `personal_access_tokens` появилась запись с `expires_at = null`
- [x] 1.3 `AuthenticatedUserData` несёт plaintext-токен вместо `browserTokenCookie`; удалить `BrowserTokenCookieData`; проверить статическим анализом (`./tools/chat stan`), что ссылок на удалённый DTO не осталось
- [x] 1.4 `AuthController` отдаёт `{"data": …, "token": "…"}` для `/auth/login` и `/auth/register`, перестаёт ставить cookie и вызывать `session()->regenerate()`/`invalidate()`; проверить feature-тестом, что ответ содержит непустой `token` и ни одного `Set-Cookie`
- [x] 1.5 Удалить поле `remember` из `LoginRequest`, `LoginCommand` и вызова в контроллере; проверить тестом, что вход без поля проходит, а тело с посторонним полем не ломает валидацию

## 2. Backend: снятие сессионного стека

- [x] 2.1 Удалить `BrowserTokenConfig`, `BrowserTokenLifecycle`, middleware `UseBrowserTokenCookie` и секцию `browser_token` вместе с ключом `guard` из `packages/backend/identity/config/identity.php`; проверить, что `grep -rn "browser_token\|BrowserToken" packages apps` не находит ничего
- [x] 2.2 Перевести маршруты identity в `routes/api.php` на `auth:sanctum`; проверить feature-тестом, что `/me` без заголовка `Authorization` отвечает `401`, а с корректным токеном — пользователем
- [x] 2.3 Убрать `$middleware->statefulApi()` из `apps/chat-api/bootstrap/app.php`; проверить интеграционным тестом, что мутация с токеном и без CSRF-handshake проходит и не отвечает `419`
- [x] 2.4 В `apps/chat-api/config/sanctum.php` очистить `stateful` и задать пустой `guard`; проверить тестом, что запрос без bearer-токена, но с cookie сессии, отвечает `401` (fallback на session-guard отсутствует)
- [x] 2.5 `BroadcastServiceProvider` регистрирует `/broadcasting/auth` с `['auth:sanctum', TouchLastSeen::class]` без `web`; проверить тестом авторизации приватного канала по bearer-токену и отказа для чужой комнаты
- [x] 2.6 Сверить `config/cors.php` с новой схемой (заголовок `Authorization` разрешён, `supports_credentials` больше не требуется); проверить тестом preflight-ответа для `/api/v1/me`

## 3. Backend: отзыв токенов

- [x] 3.1 `LogoutHandler` удаляет только `currentAccessToken()` и безопасен при его отсутствии; проверить тестом, что второй токен того же человека продолжает работать, а повторный выход не даёт ошибки уровня сервера
- [x] 3.2 `ResetPasswordHandler` удаляет все токены пользователя; проверить тестом, что ранее выданный токен после сброса отвечает `401`
- [x] 3.3 `ChangePasswordHandler` удаляет все токены, кроме текущего; проверить тестом, что запрос-инициатор остаётся авторизованным, а токен второго устройства перестаёт работать
- [x] 3.4 Проверить тестом, что отозванный токен не авторизует и `/broadcasting/auth`

## 4. Frontend: хранилище токена и клиент API

- [x] 4.1 Добавить `apps/chat-web/src/app/token.ts` — чтение, запись, очистка `localStorage['chat.auth-token']` в `try/catch` и подписка на событие `storage`; проверить unit-тестом чтение при недоступном хранилище и синхронизацию между вкладками
- [x] 4.2 `ApiClient` принимает `authToken?: () => string | null`, подставляет `Authorization: Bearer`, больше не отправляет `credentials: 'include'`, `X-XSRF-TOKEN` и не делает CSRF-handshake; удалить `ensureCsrfCookie`, `refreshCsrfCookie` и обработку `419`; проверить тестами пакета состав заголовков запроса и отсутствие сетевого вызова `/sanctum/csrf-cookie`
- [x] 4.3 `apps/chat-web/src/app/api.ts` связывает клиент с хранилищем токена; проверить, что при пустом хранилище защищённый запрос не уходит в сеть

## 5. Frontend: вход, выход, восстановление

- [x] 5.1 `identityApi.login/register` сохраняют полученный токен, `logout` стирает его в любом исходе; проверить компонентным тестом, что после входа значение появилось в хранилище, а после выхода исчезло
- [x] 5.2 `useAuth` запрашивает `/me` только при наличии токена; проверить тестом, что без токена запрос не отправляется и показывается форма входа
- [x] 5.3 Убрать `remember` из `schemas/auth.ts` и `LoginForm`; проверить тестом формы, что флажка нет, а вход проходит
- [x] 5.4 Обновить `packages/frontend/identity/tests/*` под новый контракт; проверить `./tools/chat frontend test identity`

## 6. Frontend: изображения и вложения

- [x] 6.1 Добавить `useAuthorizedImage` и `<AuthorizedImage>` в `@vendor/ui`: fetch с заголовком, `blob:`-URL, отзыв при размонтировании, общий реестр запросов по адресу, состояние ошибки; проверить unit-тестами успешную загрузку, отзыв URL и поведение при `403`
- [x] 6.2 Перевести `Avatar`, `RoomGlyph`, `AttachmentTiles`, `AttachmentGallery`, `AvatarPicker`, `MentionPicker`, `MemberRow` на новый компонент; проверить, что `grep -rn "<img" packages/frontend apps/chat-web/src` не оставляет прямых `<img src>` на адреса API
- [x] 6.3 Скачивание оригинала вложения выполняется авторизованным запросом; проверить, что кнопка сохранения файла отдаёт файл, а не HTML-ошибку
- [x] 6.4 `image-prewarm.ts` переходит на заголовок `Authorization`; проверить тестом, что прогрев не отправляет `credentials: 'include'`
- [x] 6.5 `public/sw.js`: `cache.match(request, { ignoreVary: true })`; проверить E2E-сценарием, что повторный показ ленты берёт изображения из кеша

## 7. Frontend: 401, real-time, push

- [x] 7.1 Упростить `session.ts` до одного состояния «вход недействителен» с подавлением повторов; удалить «тихое восстановление» и `silentRecovery` из `runtime-config`; проверить unit-тестом, что несколько одновременных `401` вызывают один переход
- [x] 7.2 `auth.tsx` при `401` стирает токен, гасит сокет, очищает кеш изображений и уводит на `/login`; удалить `SessionExpiredScreen.tsx` и ссылки на него; проверить компонентным тестом переход и очистку
- [x] 7.3 `echo.ts` передаёт `auth.headers.Authorization` геттером текущего токена; проверить, что после повторного входа сокет авторизуется новым значением
- [x] 7.4 `public/sw.js`: `pushsubscriptionchange` только перевыпускает подписку, без POST и без чтения XSRF; приложение при старте сверяет подписку с сервером авторизованным запросом; проверить тестом, что повторная отправка идемпотентна

## 8. Конфигурация установки

- [x] 8.1 Удалить `SANCTUM_STATEFUL_DOMAINS`, `SESSION_SECURE_COOKIE` и `AUTH_BROWSER_TOKEN_*` из `.env.example` и `docker-compose.yml`; проверить `docker compose config`
- [x] 8.2 Поднять стек по `http` и убедиться, что вход переживает перезапуск контейнера `api`; проверить `./tools/chat e2e auth` после `./tools/chat build images`

## 9. Контракт и документация

- [x] 9.1 Обновить `packages/backend/identity/openapi/paths/auth.yaml` и схемы: `token` в ответах входа и регистрации, `bearerAuth` как схема безопасности, `remember` удалён; проверить `./tools/chat openapi build && ./tools/chat openapi validate`
- [x] 9.2 Перегенерировать `packages/frontend/api-client/src/generated/schema.d.ts`; проверить отсутствие незакоммиченного diff и `./tools/chat web typecheck`
- [x] 9.3 Перевести ADR-005 в `superseded`, добавить `docs/decisions/ADR-012-bearer-token-authentication.md` с решением, альтернативами, принятым риском XSS и критериями пересмотра; проверить `./tools/chat check` (статусы документов)
- [x] 9.4 Обновить `docs/features/authentication.md`, `docs/security/threat-model.md`, `docs/operations/upgrade.md` (разовый разлогин, исчезнувшие переменные, удалённый `remember`), `README.md`; проверить `./tools/chat check`
- [x] 9.5 Обновить секцию авторизации в `demo.html`, `CHANGELOG.md` и `SUMMARY.md`; проверить `./tools/chat e2e demo`

## 10. Проверка целиком

- [x] 10.1 `./tools/chat lint`, `./tools/chat stan`, `./tools/chat test packages`, `./tools/chat test api` — зелёные
- [x] 10.2 `./tools/chat web typecheck`, `./tools/chat web test`, тесты изменённых frontend-пакетов — зелёные
- [x] 10.3 Пересобрать образы (`./tools/chat build images`) и прогнать `./tools/chat e2e critical`; E2E идёт на готовых образах, поэтому без пересборки проверяется старый код
- [x] 10.4 Обновить `apps/chat-web/e2e/auth.spec.ts`: вход, перезагрузка страницы, новый контекст браузера с тем же хранилищем, выход; проверить, что сценарий проходит
- [x] 10.5 Ручная проверка на стенде по списку из design.md («Migration Plan», шаг 6): перезапуск контейнера `api`, показ аватарок и вложений, приход сообщения по WebSocket, вход со второго устройства и выход только на одном
