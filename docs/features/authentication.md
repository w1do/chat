# Аутентификация

Статус: implemented

## Сценарии

- Регистрация: логин (3–64 символа, латиница/цифры/`._-`) и пароль ≥ 10 символов.
  Почта не запрашивается; отображаемое имя по умолчанию совпадает с логином.
  Сессия начинается сразу.
- Вход по логину и паролю с опцией «запомнить меня».
- Выход с инвалидацией сессии.
- Восстановление пароля по почте — только для аккаунтов, где почта указана
  в настройках; ответ одинаков для любого адреса, интерфейс объясняет
  требование почты вместо мнимой «отправки письма».
- Почта и пароль меняются в настройках (`PATCH /me/email`, `PATCH /me/password`;
  смена пароля требует текущий).

## Реализация

- Backend: `packages/backend/identity` (commands/handlers Register, Login,
  Logout, RequestPasswordReset, ResetPassword; Sanctum cookie SPA — ADR-005).
- Приложение: маршруты `/api/v1/auth/*`, `App\Models\User` через
  `config('identity.user_model')`, CORS/stateful/trusted proxies в
  `apps/chat-api` (`config/cors.php`, `bootstrap/app.php`).
- Frontend: `packages/frontend/identity` — `LoginForm`, `RegisterForm`,
  `RecoveryForm`, guard-хуки `useAuth`; страницы и route guards в `chat-web`.

## Права и лимиты

- Rate limits: login 5/мин (логин+IP), register 10/мин (IP), reset и смена
  почты/пароля 5/мин (IP).
- Логин уникален на уровне БД; почта уникальна при наличии значения.
- CSRF обязателен для stateful SPA-запросов; ошибки — в едином envelope.

## API

`/auth/register`, `/auth/login`, `/auth/logout`, `/auth/forgot-password`,
`/auth/reset-password`, `/me/email`, `/me/password` —
см. `apps/chat-api/openapi/dist/openapi.json`.

## Edge cases

- Неверные учётные данные → 401 `unauthenticated`; ответ одинаков для
  существующего и несуществующего логина.
- Занятый логин → 422 с ошибкой на поле `login`.
- Аккаунт без почты писем восстановления не получает.
- Занятая чужая почта при сохранении в настройках → 422.
- Неверный текущий пароль при смене → 422 на поле `current_password`.
- Неверный/истёкший токен сброса → 422.

## Критерии приёмки / проверки

- `./tools/chat test identity` — package unit+feature (19 тестов);
- `./tools/chat test api tests/Integration` — happy path, invalid credentials,
  rate limit, CSRF, CORS allowlist (8 тестов);
- `./tools/chat test api tests/Octane` + `./tools/chat smoke octane` —
  отсутствие утечки identity между запросами одного FrankenPHP worker'а;
- `./tools/chat web test identity` — формы входа, регистрации, восстановления,
  почты и пароля (13 тестов).
