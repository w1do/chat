# Канонические спеки

Действующий контракт продукта: одна capability — один каталог,
`<домен>/<capability>/spec.md`. Собраны 2026-08-28 из дельт архивных change'ей
(`openspec/changes/archive/`) в хронологии их появления: `ADDED` добавляет
требование, `MODIFIED` заменяет одноимённое на месте.

Дальше спеки меняются не руками, а через change: `openspec archive <change>`
применяет его дельту сюда.

## Что намеренно не стало канонической спекой

Три capability остались только в архиве — они описывают поведение, которого в
продукте нет:

| Capability | Change | Почему |
|---|---|---|
| `identity/browser-token-authentication` | `persist-sanctum-auth-token-cookie` | cookie-схема снята [ADR-012](../../docs/decisions/ADR-012-bearer-token-authentication.md); действующий транспорт — `identity/token-authentication` |
| `identity/session-expiry-handling` | `fix-auth-401-session-expiry-loop` | экран «Сессия истекла» и тихое восстановление удалены; разбор 401 описан в `identity/token-authentication` |
| `ai/attachment-summary` | `ai-analyze-document-summary-modal-polza` | вытеснен реализованным `ai/file-summary` (пересказ по `@ai`); в коде отсутствует |

## Правки при сборке

`identity/authentication-and-profile` и `identity/guest-accounts` содержали
утверждения о cookie-сессии, снятой ADR-012. Приведены в соответствие:
требование `SPA authentication is cookie based` заменено на
`SPA authentication is token based` (переживший его сценарий про CORS-allowlist
сохранён), формулировки про «создаётся сессия» — на «выдаётся токен».

В `chat/mention-autocomplete`, `chat/message-editing` и
`chat/presence-and-last-seen` требования были написаны русским «ДОЛЖНА»
(дельта `add-presence-edit-message-and-mention-styling`). Двенадцать
формулировок приведены к RFC 2119: безусловная обязанность — `SHALL`.
Отрицаний и смягчённых модальностей там не было, поэтому замена однозначна и
смысл не изменился. Архивные дельты оставлены как есть — это исторический
след, а не действующий контракт.

Проверка: `openspec validate --specs --strict` — 33/33.
