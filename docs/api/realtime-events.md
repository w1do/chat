# Real-time события

Статус: verified (контракт и доставка; ADR-003)

События версионируются в имени: `message.created.v1`. Payload описан JSON Schema
(draft 2020-12) в `packages/contracts/realtime/<event>.schema.json` — единственном
источнике истины для PHP broadcast-классов и TypeScript-типов.

| Событие | Канал | Данные |
|---|---|---|
| `message.created.v1` | private room | id, kind, author{id,name}, body, payload, reply_to_id, created_at |
| `message.updated.v1` | private room | id, body, edited_at |
| `message.deleted.v1` | private room | id, deleted_at |
| `reaction.changed.v1` | private room | message_id, user_id, emoji, action, count |
| `room.member_changed.v1` | private room | user_id, action (`invited`/`joined`/`left`/`removed`/`role_changed`), role |
| `typing.changed.v1` | presence room | user_id, is_typing |
| `ai.file_summary.updated.v1` | private user | id, status, progress, error_code |

Общий конверт: `event`, `version`, `room_id` (ULID), `occurred_at` (RFC 3339), `data`.

Системные записи о членстве приходят тем же `message.created.v1` с
`kind: system` и `payload: {event, actor_id}` — отдельной схемы события нет
(design 1c); текст формулирует клиент. Значения `event`: `member.joined`,
`member.invited`, `member.left`, `member.removed`.
`additionalProperties: false` — утечка недекларированных полей ломает контрактный тест
`apps/chat-api/tests/Contract/RealtimeSchemaTest.php` (фикстуры —
`tests/fixtures/realtime/`).

Правила: payload содержит только данные, доступные подписчику через HTTP API;
изменение payload = новая схема `*.v2`; broadcast — только после commit
(`ShouldDispatchAfterCommit`).

Каналы и авторизация (`apps/chat-api/routes/channels.php`):

| Канал | Кто допускается |
|---|---|
| `private-room.{roomId}` | участник комнаты |
| `presence-room.{roomId}.presence` | участник; payload — `{id, name}` |
| `private-user.{userId}` | только сам пользователь |

`ai.file_summary.updated.v1` идёт на личный канал автора запроса и несёт
только ход операции: сам черновик пересказа читается запросом
`GET /ai/file-summaries/{id}` и не размножается по транспортам
(`docs/features/ai-file-summary.md`).

Клиент не считает WebSocket источником истины: после reconnect выполняется
HTTP-ресинхронизация (`resyncRoom` в `@vendor/chat`), а состояние операций
помощника подтверждается запросом даже при полученном событии.
