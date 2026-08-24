# Реакции

Статус: implemented

- Переключение emoji-реакции (`POST /messages/{message}/reactions`):
  добавляет либо снимает; только участники комнаты.
- Уникальность `(message_id, user_id, emoji)` на уровне БД.
- Ответ — итоговое состояние `{emoji, count, reacted_by_me}`.
- UI: палитра эмодзи у каждого сообщения (не только быстрый ряд) с
  optimistic-переключением и rollback; повторный выбор снимает свою реакцию.
- Эмодзи вставляются и в текст сообщения — из композера, по позиции каретки.

Проверки: package-тесты uniqueness/toggle, feature-тест «toggles reactions for
members only», компонентные тесты выбора реакции из палитры и вставки эмодзи
в черновик.

Запуск: `./tools/chat test chat`, `./tools/chat test api`, `./tools/chat web test chat`.
