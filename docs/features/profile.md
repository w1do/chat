# Профиль пользователя

Статус: implemented

## Сценарии

- Просмотр своих данных (`GET /me`), включая логин.
- Обновление имени, локали, часового пояса (`PATCH /me/profile`).
- Добавление, смена и удаление почты (`PATCH /me/email`): поле необязательное,
  пустое значение очищает адрес и сбрасывает подтверждение.
- Смена пароля (`PATCH /me/password`) с подтверждением текущего; обновляется
  remember-токен.
- Логин неизменяем: по нему выполняется вход.

## Реализация

- Backend: `GetMeQuery`/`UpdateProfileCommand` + handlers в
  `packages/backend/identity`; валидация локали (`ll` или `ll_CC`) и timezone.
- Frontend: `ProfileForm`, `EmailForm`, `PasswordForm` в
  `packages/frontend/identity` (на примитивах `@vendor/ui`); открываются
  листами на экране «Настройки» в `chat-web`.

## Edge cases

- Невалидный timezone/locale → 422 в едином envelope.
- Занятая чужая почта → 422; неверный текущий пароль → 422.
- Гость → 401.

## Критерии приёмки / проверки

- `./tools/chat test identity`, `./tools/chat web test identity` — проходят.
