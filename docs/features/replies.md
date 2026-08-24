# Ответы на сообщения

Статус: implemented

- `reply_to_id` в пределах той же комнаты (чужая комната → 422); self-FK
  с `restrictOnDelete`.
- Мягкое удаление родителя сохраняет связь: ответ показывает контекст
  «Сообщение удалено».
- UI: `ReplyPreview` в композере, цитата в `MessageItem`.

Проверки: package-тест «soft deletes preserving replies», feature-тест
«foreign reply targets», компонентные тесты reply-флоу.
