# Backup и восстановление

Статус: in progress (процедура определена; регулярная проверка восстановления — этап 12)

## Что бэкапить

| Данные | Где | Как |
|---|---|---|
| PostgreSQL | volume `postgres-data` | `pg_dump` (см. ниже) |
| Загруженные файлы | бакет объектного хранилища (`minio-data`) | `mc mirror` или снапшот volume |
| Environment | `.env` | зашифрованная копия вне сервера |
| Typesense | volume `typesense-data` | необязательно: индекс восстановим reindex-командой (этап 9) |

## Backup

База и файлы снимаются вместе: аватарки и вложения живут в объектном
хранилище, а сведения о них — в базе. Копия только одного из двух даёт
переписку со сломанными картинками (ADR-011).

```bash
# 1. База
docker compose -p chat exec postgres pg_dump -U "$DB_USERNAME" -Fc "$DB_DATABASE" > chat-$(date +%F).dump

# 2. Файлы: зеркало бакета на диск
docker compose -p chat exec minio \
  mc alias set local http://127.0.0.1:9000 "$S3_ACCESS_KEY_ID" "$S3_SECRET_ACCESS_KEY"
docker compose -p chat exec minio mc mirror --overwrite local/chat /data/backup-$(date +%F)
```

Для внешнего S3-хранилища вместо встроенного берите его собственный механизм
копий (версионирование бакета или репликация).

## Restore

```bash
docker compose -p chat stop api worker scheduler reverb

# 1. База
docker compose -p chat exec -T postgres pg_restore -U "$DB_USERNAME" -d "$DB_DATABASE" --clean < chat-YYYY-MM-DD.dump

# 2. Файлы
docker compose -p chat exec minio mc mirror --overwrite /data/backup-YYYY-MM-DD local/chat

docker compose -p chat start api worker scheduler reverb
```

После восстановления убедитесь, что хранилище на месте:

```bash
curl https://<домен>/api/v1/readiness    # storage: ok
./tools/chat smoke storage
```

Восстановление обязано проверяться на тестовой среде до того, как понадобится
— вместе с файлами, а не только с базой.

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
