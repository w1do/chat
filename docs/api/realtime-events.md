# Real-time события

Статус: implemented (контракт; доставка — этап 7)

События версионируются в имени: `message.created.v1`. Payload описан JSON Schema
(draft 2020-12) в `packages/contracts/realtime/<event>.schema.json` — единственном
источнике истины для PHP broadcast-классов и TypeScript-типов.

| Событие | Канал | Данные |
|---|---|---|
| `message.created.v1` | private room | id, author{id,name}, body, reply_to_id, created_at |
| `message.updated.v1` | private room | id, body, edited_at |
| `message.deleted.v1` | private room | id, deleted_at |
| `reaction.changed.v1` | private room | message_id, user_id, emoji, action, count |
| `room.member_changed.v1` | private room | user_id, action, role |
| `typing.changed.v1` | presence room | user_id, is_typing |

Общий конверт: `event`, `version`, `room_id` (ULID), `occurred_at` (RFC 3339), `data`.
`additionalProperties: false` — утечка недекларированных полей ломает контрактный тест
`apps/chat-api/tests/Contract/RealtimeSchemaTest.php` (фикстуры —
`tests/fixtures/realtime/`).

Правила: payload содержит только данные, доступные подписчику через HTTP API;
изменение payload = новая схема `*.v2`; broadcast — только после commit.
