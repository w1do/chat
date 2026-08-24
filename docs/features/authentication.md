# Аутентификация

Статус: implemented

## Сценарии

- Регистрация (имя, email, пароль ≥ 10 символов) → сессия начинается сразу.
- Вход по email/паролю с опцией «запомнить меня».
- Выход с инвалидацией сессии.
- Восстановление пароля: запрос ссылки (ответ не раскрывает существование
  email) → установка нового пароля по токену.

## Реализация

- Backend: `packages/backend/identity` (commands/handlers Register, Login,
  Logout, RequestPasswordReset, ResetPassword; Sanctum cookie SPA — ADR-005).
- Приложение: маршруты `/api/v1/auth/*`, `App\Models\User` через
  `config('identity.user_model')`, CORS/stateful/trusted proxies в
  `apps/chat-api` (`config/cors.php`, `bootstrap/app.php`).
- Frontend: `packages/frontend/identity` — `LoginForm`, `RegisterForm`,
  `RecoveryForm`, guard-хуки `useAuth`; страницы и route guards в `chat-web`.

## Права и лимиты

- Rate limits: login 5/мин (email+IP), register 10/мин (IP), reset 5/мин (IP).
- CSRF обязателен для stateful SPA-запросов; ошибки — в едином envelope.

## API

`/auth/register`, `/auth/login`, `/auth/logout`, `/auth/forgot-password`,
`/auth/reset-password` — см. `apps/chat-api/openapi/dist/openapi.json`.

## Edge cases

- Неверные учётные данные → 401 `unauthenticated` (без деталей).
- Повторная регистрация email → 422.
- Ответ forgot-password одинаков для существующего/несуществующего email.
- Неверный/истёкший токен сброса → 422.

## Критерии приёмки / проверки

- `./tools/chat test identity` — package unit+feature (13 тестов);
- `./tools/chat test api tests/Integration` — happy path, invalid credentials,
  rate limit, CSRF, CORS allowlist (8 тестов);
- `./tools/chat test api tests/Octane` + `./tools/chat smoke octane` —
  отсутствие утечки identity между запросами одного FrankenPHP worker'а;
- `./tools/chat web test identity` — формы: happy/invalid/error/keyboard (9 тестов).
