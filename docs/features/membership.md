# Членство в комнатах

Статус: verified (E2E `./tools/chat e2e messaging`)

## Роли и права

| Действие | owner | admin | member | guest |
|---|---|---|---|---|
| Просмотр участников | ✓ | ✓ | ✓ | публичные — ✓ |
| Приглашение | ✓ | ✓ | — | — |
| Вступление (public) | — (уже член) | — | — | ✓ |
| Выход | — (нужна передача владения) | ✓ | ✓ | — |
| Смена ролей admin/member | ✓ | — | — | — |

Роль owner не назначается сменой роли; ровно один owner на комнату
закреплён частичным уникальным индексом БД.

## Реализация

- Backend: `RoomMember`, `MembershipPolicy`, команды Invite/Join/Leave/
  ChangeMemberRole (конфликты — 409, гонки — `lockForUpdate` в транзакции),
  scoped route bindings (участник чужой комнаты → 404).
- Frontend: `MembershipManager` в `@vendor/chat`; `RoomSettingsPage` в `chat-web`.

## API

`GET/POST /rooms/{room}/members`, `POST/DELETE /rooms/{room}/members/me`,
`PATCH /rooms/{room}/members/{member}` — см. OpenAPI dist.

## Edge cases

- Повторное приглашение/вступление → 409/403; не-член → 403; чужой member → 404.

## Критерии приёмки / проверки

- `./tools/chat test chat`, `./tools/chat test api`, `./tools/chat web test chat` — проходят.

Запуск E2E: `./tools/chat e2e messaging` — вступление в открытую комнату и доступ
к переписке после него.

## Приглашение по ссылке

К вступлению в открытую комнату и приглашению по идентификатору добавился
третий путь — ссылка: участник нажимает «Пригласить», человек открывает ссылку
и оказывается в комнате, даже если аккаунта у него ещё не было. Подробности и
границы — `docs/features/invite-links.md`.
