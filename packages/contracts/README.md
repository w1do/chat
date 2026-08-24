# @vendor/contracts

Языконезависимые JSON Schema (draft 2020-12) версионированных real-time событий.
Единственный источник истины для имён и payload WebSocket-событий (STRUCTURE.md §9).

## События

| Схема | Событие |
|---|---|
| `realtime/message.created.v1.schema.json` | `message.created.v1` |
| `realtime/message.updated.v1.schema.json` | `message.updated.v1` |
| `realtime/message.deleted.v1.schema.json` | `message.deleted.v1` |
| `realtime/reaction.changed.v1.schema.json` | `reaction.changed.v1` |
| `realtime/room.member_changed.v1.schema.json` | `room.member_changed.v1` |
| `realtime/typing.changed.v1.schema.json` | `typing.changed.v1` |

Каждая схема описывает общий конверт (`event`, `version`, `room_id`,
`occurred_at`) и объект `data` с полями конкретного события;
`additionalProperties: false` защищает от утечки недекларированных полей.
Фикстуры и контрактный тест — `apps/chat-api/tests/{fixtures/realtime,Contract/RealtimeSchemaTest.php}`.

## Потребители

- **PHP** (`apps/chat-api`): контрактный тест `tests/Contract/RealtimeSchemaTest.php`
  валидирует payload broadcast-классов пакетов против этих схем (opis/json-schema в require-dev приложения). Broadcast-классы живут в
  `packages/backend/<pkg>/src/Infrastructure/Broadcasting/` и обязаны соответствовать схеме.
- **TypeScript** (`packages/frontend/chat`): типы событий в `src/realtime/eventMap.ts`
  генерируются из схем инструментом `json-schema-to-typescript` (задача 3.4/7.4);
  сгенерированные типы не правятся руками.

## Правила версионирования

- Изменение payload = новая схема `*.v2.schema.json`, старая не удаляется.
- Обратной несовместимости внутри одной версии не бывает.
