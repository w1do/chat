# Единый error envelope

Статус: implemented

API всегда отвечает JSON, включая исключения. Любая ошибка имеет форму:

```json
{
  "code": "validation_failed",
  "message": "The given data is invalid.",
  "details": { "errors": { "name": ["The name field is required."] } },
  "trace_id": "01J8ZC2V9Q4T5W6X7Y8Z9ABCDE"
}
```

- `code` — машиночитаемый код (список ниже), стабильная часть контракта;
- `message` — человекочитаемое описание; для 500 внутренние детали не раскрываются;
- `details` — объект с дополнительными данными (`errors` для валидации), иначе `{}`;
- `trace_id` — идентификатор трассировки; дублируется в заголовке `X-Trace-Id`.
  Валидный входящий `X-Trace-Id` (8–64 символа `[0-9a-zA-Z-]`) переиспользуется.

| Статус | code | Условие |
|---|---|---|
| 422 | `validation_failed` | ошибка валидации Form Request |
| 401 | `unauthenticated` | нет аутентификации |
| 403 | `forbidden` | запрет Policy/Gate |
| 404 | `not_found` | ресурс или маршрут не найден |
| 409 | `conflict` | конфликт доменного состояния |
| 429 | `rate_limited` | rate limit; заголовок `Retry-After` |
| 405 | `method_not_allowed` | неверный HTTP-метод |
| 500 | `server_error` | неожиданная ошибка |

Реализация: `apps/chat-api/app/Support/ApiErrorEnvelope.php`, подключение —
`bootstrap/app.php`; тесты — `tests/Feature/ErrorEnvelopeTest.php`. Клиентская
обработка (401/419/429, `trace_id`) — `packages/frontend/api-client/src/{client,errors}.ts`.
