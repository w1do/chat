# Правила HTTP API

Статус: implemented (базовые правила; расширяется вместе с endpoints)

- Базовый путь `/api/v1`; версия в пути, breaking change = новая версия.
- Ответы и ошибки — только JSON; ошибки в [едином envelope](error-envelope.md).
- Статусы: `200/201/204/400/401/403/404/409/422/429/500`.
- Аутентификация — Sanctum cookie SPA (см. ADR-005, этап 4).
- Cursor pagination для сообщений и активных лент (параметры `cursor`, `limit`).
- `Idempotency-Key` для повторяемых опасных мутаций (отправка сообщения).
- Вложенные ресурсы используют scoped route model binding
  (`/rooms/{room}/messages/{message}` не отдаёт чужое сообщение).
- Каждый endpoint: Form Request + Policy + Resource + feature-тест + OpenAPI-фрагмент
  в `packages/backend/<pkg>/openapi/`; итоговая спецификация —
  `apps/chat-api/openapi/dist/openapi.json` (см. ADR-008).
