# Сообщения

Статус: verified (E2E `./tools/chat e2e messaging` и `./tools/chat e2e realtime`)

## Сценарии

- Отправка сообщения участником комнаты; тело хранится каноничным plain text
  (управляющие символы удаляются, HTML — как текст), лимит 4000 символов.
- Сообщение без текста допустимо, если у него есть вложения; форма без
  текста и без вложений отклоняется (см. `docs/features/attachments.md`).
- Cursor-пагинация истории (новые → старые, ULID-курсор, стабильный порядок
  без дублей при появлении новых сообщений).
- Редактирование своего сообщения в окне 15 минут (`edited_at`).
- Мягкое удаление автором либо owner/admin: строка остаётся, тело скрывается
  (`deleted: true`, `body: null`), ответы сохраняются; вложения удалённого
  сообщения больше не перечисляются и не отдаются.
- Удаление комнаты навсегда уносит из хранилища файлы вложений её сообщений
  вместе с миниатюрами (отложенным идемпотентным заданием).
- Идемпотентная отправка по `Idempotency-Key` (повтор возвращает 200 с тем же
  сообщением; в БД одна строка).

## Реализация

- Backend: `packages/backend/chat` — VO `MessageBody`/`MessageCursor`,
  контракт `MessageSanitizer` (+ `PlainTextSanitizer`), `MessagePolicy`,
  команды Send/Edit/Delete/MarkRoomRead + запросы ListMessages/GetMessage/
  GetUnreadCounters; транзакции с `lockForUpdate`; доменные события
  MessageCreated/Updated/Deleted (broadcast — этап 7).
- Frontend: `MessageList`/`MessageItem`/`MessageComposer` в `@vendor/chat`,
  optimistic-отправка с rollback, безопасный текстовый рендер.

## Виды сообщений

Лента содержит обычные сообщения (`kind: text`) и системные записи
(`kind: system`) о вступлении, приглашении и выходе участника. Системная
запись хранит событие и его участника, а формулировку подставляет клиент —
язык интерфейса можно менять, не переписывая историю. Такие записи нельзя
редактировать, удалять и реагировать на них (403).

## API

`GET/POST /rooms/{room}/messages`, `GET/PATCH/DELETE /messages/{message}` —
см. OpenAPI dist.

## Критерии приёмки / проверки

- `./tools/chat test chat-messages` (домен) и `./tools/chat test api
  tests/Feature/MessagesTest.php` (9 feature-тестов); `./tools/chat web test chat`.

Запуск E2E: `./tools/chat e2e messaging` — двое в комнате, живая доставка,
поиск по истории и удаление своего сообщения.
