# Backup и восстановление

Статус: in progress (процедура определена; регулярная проверка восстановления — этап 12)

## Что бэкапить

| Данные | Где | Как |
|---|---|---|
| PostgreSQL | volume `postgres-data` | `pg_dump` (см. ниже) |
| Загруженные файлы | volume `api-storage` или S3 | снапшот volume / версии бакета |
| Environment | `.env` | зашифрованная копия вне сервера |
| Typesense | volume `typesense-data` | необязательно: индекс восстановим reindex-командой (этап 9) |

## Backup

```bash
docker compose -p chat exec postgres pg_dump -U "$DB_USERNAME" -Fc "$DB_DATABASE" > chat-$(date +%F).dump
```

## Restore

```bash
docker compose -p chat stop api worker scheduler reverb
docker compose -p chat exec -T postgres pg_restore -U "$DB_USERNAME" -d "$DB_DATABASE" --clean < chat-YYYY-MM-DD.dump
docker compose -p chat start api worker scheduler reverb
```

Восстановление обязана проверяться на тестовой среде до того, как понадобится.

## Удалённая комната

Удаление комнаты владельцем (`DELETE /rooms/{room}`) необратимо: комната, её
сообщения, реакции, приглашения и участие стираются из базы, корзины нет.
Вернуть такую комнату может только восстановление базы из резервной копии — со
всеми последствиями отката к моменту снимка. Откат образа приложения не
поможет: удалены данные, а не код.

Поэтому частота снимков базы выбирается по тому, сколько переписки не жалко
потерять, а не только по риску отказа диска. Само удаление видно в журнале
аудита: действие `chat.room.deleted` с автором, названием комнаты и числом
удалённых сообщений.
