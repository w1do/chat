#!/usr/bin/env bash
# Восстановление старой базы PostgreSQL из тома, оставшегося от прежнего
# развёртывания.
#
# Скрипт ничего не удаляет: старый том только читается, работа идёт с его
# копией, а восстановление попадает в НОВУЮ базу текущего кластера.
#
#   ./infra/scripts/recover-postgres.sh --auto
#   ./infra/scripts/recover-postgres.sh --from chat_old_postgres-data --source-db chat
#
# Параметры:
#   --from VOLUME        том со старым кластером
#   --auto               найти такой том автоматически (если он один)
#   --source-db NAME     база в старом кластере (по умолчанию chat)
#   --source-role NAME   роль для подключения (по умолчанию подбирается)
#   --target CONTAINER   контейнер текущего postgres (по умолчанию — по метке compose)
#   --into NAME          имя новой базы (по умолчанию chat_restored)
#   --work-dir DIR       куда класть дамп (по умолчанию /var/backups/chat)
#   --keep               не удалять временные контейнер и том
#   --dry-run            показать план и выйти
set -euo pipefail

FROM=""; AUTO=0; SOURCE_DB="chat"; SOURCE_ROLE=""; TARGET=""; INTO="chat_restored"
WORKDIR="/var/backups/chat"; KEEP=0; DRY=0

while [ $# -gt 0 ]; do
    case "$1" in
        --from) FROM="${2:-}"; shift 2 ;;
        --auto) AUTO=1; shift ;;
        --source-db) SOURCE_DB="${2:-}"; shift 2 ;;
        --source-role) SOURCE_ROLE="${2:-}"; shift 2 ;;
        --target) TARGET="${2:-}"; shift 2 ;;
        --into) INTO="${2:-}"; shift 2 ;;
        --work-dir) WORKDIR="${2:-}"; shift 2 ;;
        --keep) KEEP=1; shift ;;
        --dry-run) DRY=1; shift ;;
        -h|--help) sed -n '2,24p' "$0"; exit 0 ;;
        *) echo "неизвестный параметр: $1" >&2; exit 64 ;;
    esac
done

say() { printf '\n== %s\n' "$*"; }
die() { printf '\nОШИБКА: %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null || die "docker не найден"

# ---- текущий контейнер postgres -------------------------------------------
if [ -z "$TARGET" ]; then
    TARGET=$(docker ps -q -f label=com.docker.compose.service=postgres | head -1)
    [ -n "$TARGET" ] || die "не найден работающий контейнер postgres; укажите --target"
fi
TARGET_ID=$(docker inspect -f '{{.Id}}' "$TARGET" 2>/dev/null) || die "контейнер $TARGET не найден"
TARGET_NAME=$(docker inspect -f '{{.Name}}' "$TARGET_ID" | sed 's@^/@@')
TARGET_IMAGE=$(docker inspect -f '{{.Config.Image}}' "$TARGET_ID")
TARGET_USER=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$TARGET_ID" | sed -n 's/^POSTGRES_USER=//p' | head -1)
TARGET_USER=${TARGET_USER:-postgres}
TARGET_VOLUME=$(docker inspect -f '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}} {{end}}{{end}}' "$TARGET_ID" | awk '{print $1}')

say "текущая установка"
echo "  контейнер : $TARGET_NAME"
echo "  образ     : $TARGET_IMAGE"
echo "  роль      : $TARGET_USER"
echo "  том       : ${TARGET_VOLUME:-(не named volume)}"

# ---- поиск старого кластера ------------------------------------------------
scan_volume() {
    docker run --rm --entrypoint sh -v "$1":/v "$TARGET_IMAGE" -c '
        p=/v
        if [ -s "$p/PG_VERSION" ]; then
            printf "root %s .\n" "$(cat "$p/PG_VERSION")"
            exit 0
        fi
        for d in "$p"/*/docker; do
            if [ -s "$d/PG_VERSION" ]; then
                printf "nested %s %s\n" "$(cat "$d/PG_VERSION")" "$(echo "$d" | sed s@^/v/@@)"
            fi
        done' 2>/dev/null || true
}

if [ "$AUTO" = 1 ] && [ -z "$FROM" ]; then
    say "ищу тома с кластером PostgreSQL"
    CANDIDATES=()
    for v in $(docker volume ls -q); do
        [ "$v" = "$TARGET_VOLUME" ] && continue
        info=$(scan_volume "$v")
        [ -z "$info" ] && continue
        layout=$(echo "$info" | awk '{print $1}')
        major=$(echo "$info" | awk '{print $2}')
        size=$(docker system df -v 2>/dev/null | awk -v name="$v" '$1 == name {print $3}' | head -1)
        printf '  %-45s %s, PostgreSQL %s, %s\n' "$v" "$layout" "$major" "${size:-?}"
        CANDIDATES+=("$v|$layout|$major")
    done
    [ "${#CANDIDATES[@]}" -gt 0 ] || die "томов с кластером PostgreSQL не найдено — данных на этом сервере нет"
    [ "${#CANDIDATES[@]}" -eq 1 ] || die "кандидатов несколько, укажите нужный через --from"
    IFS='|' read -r FROM LAYOUT MAJOR <<< "${CANDIDATES[0]}"
fi

[ -n "$FROM" ] || die "укажите --from VOLUME или --auto"
[ "$FROM" != "$TARGET_VOLUME" ] || die "это том текущей установки; восстановление из него не имеет смысла"
docker volume inspect "$FROM" >/dev/null 2>&1 || die "том $FROM не найден"

if [ -z "${LAYOUT:-}" ]; then
    info=$(scan_volume "$FROM")
    [ -n "$info" ] || die "в томе $FROM нет кластера PostgreSQL"
    LAYOUT=$(echo "$info" | awk '{print $1}')
    MAJOR=$(echo "$info" | awk '{print $2}')
fi

say "источник"
echo "  том       : $FROM"
echo "  раскладка : $LAYOUT (PostgreSQL $MAJOR)"

SOURCE_IMAGE="postgres:${MAJOR}-alpine"
if ! docker image inspect "$SOURCE_IMAGE" >/dev/null 2>&1; then
    say "скачиваю $SOURCE_IMAGE"
    docker pull "$SOURCE_IMAGE" >/dev/null || die "не удалось скачать $SOURCE_IMAGE"
fi

# ---- проверки до изменений -------------------------------------------------
if docker exec "$TARGET_ID" psql -U "$TARGET_USER" -d postgres -tAc "select 1 from pg_database where datname = '$INTO'" | grep -q 1; then
    die "база $INTO уже есть в текущем кластере; задайте другое имя через --into"
fi

TS=$(date +%Y%m%d-%H%M%S)
mkdir -p "$WORKDIR" 2>/dev/null || { WORKDIR="$PWD"; mkdir -p "$WORKDIR"; }
DUMP="$WORKDIR/chat-old-$TS.dump"

if [ "$DRY" = 1 ]; then
    say "план (dry-run)"
    echo "  1. скопировать том $FROM -> chat_recover_src"
    echo "  2. поднять временный сервер $SOURCE_IMAGE на копии"
    echo "  3. pg_dump базы $SOURCE_DB -> $DUMP"
    echo "  4. создать базу $INTO в $TARGET_NAME и восстановить туда дамп"
    echo "  5. показать количество users/rooms/messages"
    exit 0
fi

TMP_VOL="chat_recover_src"
TMP_CT="chat_recover_src"
cleanup() {
    if [ "$KEEP" = 0 ]; then
        docker rm -f "$TMP_CT" >/dev/null 2>&1 || true
        docker volume rm "$TMP_VOL" >/dev/null 2>&1 || true
    fi
}
trap cleanup EXIT

say "копирую том (оригинал не трогаю)"
docker rm -f "$TMP_CT" >/dev/null 2>&1 || true
docker volume rm "$TMP_VOL" >/dev/null 2>&1 || true
docker volume create "$TMP_VOL" >/dev/null
docker run --rm -v "$FROM":/from -v "$TMP_VOL":/to --entrypoint sh "$SOURCE_IMAGE" -c 'cp -a /from/. /to/' || die "не удалось скопировать том"

if [ "$LAYOUT" = "root" ]; then
    MOUNT="/var/lib/postgresql/data"
else
    MOUNT="/var/lib/postgresql"
fi

say "поднимаю временный сервер на копии"
docker run -d --name "$TMP_CT" --network none -v "$TMP_VOL":"$MOUNT" "$SOURCE_IMAGE" >/dev/null

ready=0
for _ in $(seq 1 60); do
    if docker exec "$TMP_CT" pg_isready -q >/dev/null 2>&1; then ready=1; break; fi
    sleep 2
done
if [ "$ready" = 0 ]; then
    echo "--- журнал временного сервера ---" >&2
    docker logs --tail 30 "$TMP_CT" >&2 || true
    die "временный сервер не поднялся (частая причина — не та major-версия образа)"
fi

if [ -z "$SOURCE_ROLE" ]; then
    for r in "$TARGET_USER" chat postgres; do
        if docker exec "$TMP_CT" psql -U "$r" -d postgres -tAc 'select 1' >/dev/null 2>&1; then
            SOURCE_ROLE="$r"; break
        fi
    done
fi
[ -n "$SOURCE_ROLE" ] || die "не удалось подобрать роль; задайте --source-role"

say "базы в старом кластере (роль $SOURCE_ROLE)"
docker exec "$TMP_CT" psql -U "$SOURCE_ROLE" -d postgres -tAc "select datname from pg_database where datistemplate = false order by 1" | sed 's/^/  /'

if ! docker exec "$TMP_CT" psql -U "$SOURCE_ROLE" -d postgres -tAc "select 1 from pg_database where datname = '$SOURCE_DB'" | grep -q 1; then
    die "базы $SOURCE_DB в старом кластере нет; выберите её через --source-db"
fi

say "снимаю дамп $SOURCE_DB"
docker exec "$TMP_CT" pg_dump -U "$SOURCE_ROLE" -Fc -d "$SOURCE_DB" > "$DUMP"
echo "  $DUMP ($(du -h "$DUMP" | cut -f1))"
docker exec "$TMP_CT" pg_dumpall -U "$SOURCE_ROLE" --globals-only > "$WORKDIR/chat-old-globals-$TS.sql" 2>/dev/null || true

say "восстанавливаю в новую базу $INTO (текущая база не затрагивается)"
docker exec "$TARGET_ID" psql -U "$TARGET_USER" -d postgres -c "CREATE DATABASE \"$INTO\"" >/dev/null
docker cp "$DUMP" "$TARGET_ID":/tmp/restore.dump >/dev/null
set +e
docker exec "$TARGET_ID" pg_restore -U "$TARGET_USER" -d "$INTO" --no-owner --no-privileges /tmp/restore.dump > "$WORKDIR/restore-$TS.log" 2>&1
RESTORE_RC=$?
set -e
docker exec "$TARGET_ID" rm -f /tmp/restore.dump >/dev/null 2>&1 || true
echo "  pg_restore вернул $RESTORE_RC (ненулевой код бывает из-за отсутствующих ролей или расширений — смотрите $WORKDIR/restore-$TS.log)"

say "что получилось в $INTO"
TABLES=$(docker exec "$TARGET_ID" psql -U "$TARGET_USER" -d "$INTO" -tAc "select count(*) from information_schema.tables where table_schema = 'public'" 2>/dev/null | tr -d '[:space:]' || true)
echo "  таблиц в public: ${TABLES:-?}"
for q in "select 'users='||count(*) from users" "select 'rooms='||count(*) from rooms" "select 'messages='||count(*) from messages"; do
    docker exec "$TARGET_ID" psql -U "$TARGET_USER" -d "$INTO" -tAc "$q" 2>/dev/null | sed 's/^/  /' || true
done
if [ "${TABLES:-0}" = "0" ]; then
    echo
    echo "ВНИМАНИЕ: в восстановленной базе нет таблиц — дамп, вероятно, снят с пустой базы." >&2
    echo "          Проверьте --source-db: список баз старого кластера напечатан выше." >&2
fi

say "дальше"
echo "  данные восстановлены в отдельную базу \"$INTO\"; текущая база не изменена."
echo
echo "  переключить приложение на восстановленные данные:"
echo "      DB_DATABASE=$INTO        (панель → Environment, затем Redeploy)"
echo
echo "  откат: вернуть DB_DATABASE на прежнее значение."
echo "  дамп сохранён: $DUMP"
echo
echo "  файлы (аватарки, вложения) переезжают отдельно — копия старого тома"
echo "  объектного хранилища в текущий; см. docs/operations/backup-restore.md"
