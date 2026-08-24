# Реакции

Статус: implemented

- Переключение emoji-реакции (`POST /messages/{message}/reactions`):
  добавляет либо снимает; только участники комнаты.
- Уникальность `(message_id, user_id, emoji)` на уровне БД.
- Ответ — итоговое состояние `{emoji, count, reacted_by_me}`.
- UI: `ReactionBar` с optimistic-переключением и rollback.

Проверки: package-тесты uniqueness/toggle, feature-тест «toggles reactions for
members only», компонентный тест reaction-флоу.
