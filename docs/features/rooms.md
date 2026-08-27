# Комнаты

Статус: verified (E2E `./tools/chat e2e messaging`)

## Сценарии

- Создание публичной/приватной комнаты; создатель становится owner.
- Список видимых комнат: публичные + приватные, где пользователь состоит;
  фильтр по видимости и поиск по имени.
- Состав комнаты показывает роль и присутствие каждого участника: зелёная
  точка на аватарке и подпись «В сети» либо «был(а) в сети …»
  (`docs/features/presence-typing.md`). Шапка комнаты добавляет «N в сети».
- Просмотр и управление комнатой из её настроек: название, описание и
  фотографию правят owner и admin, удаляет — только owner. Пока фотографии
  нет, комната показана эмодзи из названия —
  `docs/features/profile-images.md`.
- Архивация (owner/admin, мягкая — `archived_at`): переписка сохраняется и
  доступна для чтения.
- Удаление навсегда (только owner): комната, сообщения, реакции, приглашения и
  участие исчезают безвозвратно. Подтверждение — набрать название комнаты
  дословно. Восстановление возможно только из резервной копии базы
  (`docs/operations/backup-restore.md`).
- Участники, у которых удалённая комната открыта, получают `room.deleted.v1` и
  возвращаются к списку комнат с сообщением.
- Приватные комнаты не видны не-участникам ни в списке, ни по прямой ссылке (403).
- В том же списке живут личные переписки: комната подписана названием,
  диалог — именем собеседника. Комнатные действия к диалогу не
  применяются — `docs/features/direct-messages.md`.

## Реализация

- Backend: `packages/backend/chat` — `Room` (rich-модель со scope `visibleTo`),
  `RoomPolicy` (`update`/`archive` — owner+admin, `delete` — owner; постороннему
  `delete` отвечает 404), команды Create/Update/Archive/DeleteRoom + запросы
  List/GetRoom. Удаление идёт одной транзакцией и записывается в журнал аудита
  (`chat.room.deleted`).
- БД: `rooms` (ULID PK, visibility, FK `created_by` → users, `archived_at`);
  проверено на чистом PostgreSQL.
- Frontend: `@vendor/chat` — `RoomList` (loading/empty/error/keyboard),
  `RoomHeader`, `CreateRoomForm`, `RoomManagePanel` (название, описание,
  удаление с подтверждением); `ChatPage` и `RoomSettingsPage` в `chat-web`.

## API

`GET/POST /rooms`, `GET/PATCH/DELETE /rooms/{room}`,
`POST /rooms/{room}/archive` — см. OpenAPI dist. Представление переписки
сообщает вид (`kind`) и для диалога — собеседника (`counterpart`) вместе с его
присутствием. Участник в `GET /rooms/{room}/members` несёт ник (`username`),
`is_online` и `last_seen_at`.

**BREAKING**: `DELETE /rooms/{room}` удаляет комнату навсегда; архивирование
переехало на `POST /rooms/{room}/archive`.

Real-time: `room.deleted.v1` (`packages/contracts/realtime`).

## Критерии приёмки / проверки

- `./tools/chat test chat` — матрица owner/admin/member/guest (8 тестов);
- `./tools/chat test api tests/Feature/RoomsTest.php` — feature-тесты правки,
  архивирования и удаления (включая 403 админу и 404 постороннему);
- `./tools/chat web test chat` — компонентные тесты `RoomManagePanel`,
  `useRoomActions` и строки участника с присутствием.

Запуск E2E: `./tools/chat e2e messaging` — создание комнаты и вход в неё вторым
участником; `./tools/chat e2e room-management` — переименование и удаление
комнаты на глазах у второго участника.
