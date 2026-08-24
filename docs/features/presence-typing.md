# Присутствие и набор текста

Статус: verified (E2E `./tools/chat e2e realtime` и `./tools/chat smoke websocket` проходят)

## Сценарии

- Участник открывает комнату → входит в presence-канал; остальные видят его
  в списке присутствующих (`PresenceDots`).
- Пользователь печатает → сигнал `POST /rooms/{room}/typing` (троттлинг 3 с) →
  событие `typing.changed.v1` в presence-канале → индикатор у остальных.
- Отправка сообщения гасит индикатор (`is_typing: false`).
- Молчаливый обрыв: запись присутствия/набора истекает по TTL
  (60 с и 7 с соответственно) — «призраки» не остаются.

## Реализация

- Контракт `PresenceRegistry` (Domain) + `RedisPresenceRegistry`
  (sorted set со score = момент истечения, вычистка просроченных при каждом
  обращении). Реестр — источник истины для правила «не уведомлять активного
  в комнате» (этап 8), presence-канал Reverb его лишь подпитывает.
- `SetTypingCommand`/`SetTypingHandler` продлевают активность и публикуют
  доменное событие; broadcast — `TypingChangedV1` (presence-канал).
- Frontend: `useRealtimeRoom` (подписка только для участников,
  страховочный таймаут набора), `useTyping`, `TypingIndicator`, `PresenceDots`.

## Проверки

- `./tools/chat test api tests/Integration/RedisPresenceRegistryTest.php` —
  TTL, disconnect-очистка, active-in-room (реальный Redis);
- `./tools/chat test api tests/Integration/RealtimeTest.php` — авторизация
  каналов, presence payload, typing endpoint;
- `./tools/chat e2e realtime`, `./tools/chat smoke websocket`.
