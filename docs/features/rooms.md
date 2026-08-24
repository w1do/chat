# Комнаты

Статус: implemented

## Сценарии

- Создание публичной/приватной комнаты; создатель становится owner.
- Список видимых комнат: публичные + приватные, где пользователь состоит;
  фильтр по видимости и поиск по имени.
- Просмотр, обновление (owner/admin), архивация (owner, мягкая — `archived_at`).
- Приватные комнаты не видны не-участникам ни в списке, ни по прямой ссылке (403).

## Реализация

- Backend: `packages/backend/chat` — `Room` (rich-модель со scope `visibleTo`),
  `RoomPolicy`, команды Create/Update/ArchiveRoom + запросы List/GetRoom.
- БД: `rooms` (ULID PK, visibility, FK `created_by` → users, `archived_at`);
  проверено на чистом PostgreSQL.
- Frontend: `@vendor/chat` — `RoomList` (loading/empty/error/keyboard),
  `RoomHeader`, `CreateRoomForm`; `ChatPage` в `chat-web`.

## API

`GET/POST /rooms`, `GET/PATCH/DELETE /rooms/{room}` — см. OpenAPI dist.

## Критерии приёмки / проверки

- `./tools/chat test chat` — матрица owner/admin/member/guest (8 тестов);
- `./tools/chat test api tests/Feature/RoomsTest.php` — 9 feature-тестов;
- `./tools/chat web test chat` — 8 компонентных тестов.
