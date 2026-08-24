# Упоминания

Статус: implemented

- Клиент передаёт `mentions: [user_id…]` (валидация: ULID, существующие
  пользователи, ≤ 20); VO `MentionList` дедуплицирует.
- Хранятся в JSON-колонке `messages.mentions`; доставка уведомлений — этап 8.
- UI: `MentionPicker` — подбор участника по `@имя` в композере.

Проверки: feature-тест «stores mentions of room members», компонентный тест
mention-флоу.

Запуск: `./tools/chat test chat`, `./tools/chat test api`, `./tools/chat web test chat`.
