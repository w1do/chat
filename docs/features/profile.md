# Профиль пользователя

Статус: implemented

## Сценарии

- Просмотр своих данных (`GET /me`).
- Обновление имени, локали, часового пояса (`PATCH /me/profile`).
- Смена email в MVP не поддерживается (требует подтверждения — отдельная задача).

## Реализация

- Backend: `GetMeQuery`/`UpdateProfileCommand` + handlers в
  `packages/backend/identity`; валидация локали (`ll` или `ll_CC`) и timezone.
- Frontend: `ProfileForm` в `packages/frontend/identity`; `ProfilePage`
  в `chat-web` за route guard'ом.

## Edge cases

- Невалидный timezone/locale → 422 в едином envelope.
- Гость → 401.

## Критерии приёмки / проверки

- `./tools/chat test identity`, `./tools/chat web test identity` — проходят.
