# ADR-007: Docker Compose как основной способ self-hosted поставки

- Статус: accepted
- Дата: 2026-08-24

## Контекст

Продукт — self-hosted чат, устанавливаемый клиентом на собственную
инфраструктуру одной документированной командой. Стек состоит из нескольких
long-running процессов одного Laravel-приложения (Octane API, Horizon worker,
scheduler, Reverb), SPA-статики, reverse proxy, PostgreSQL, Redis, Typesense и
опционального S3-хранилища. Инструкция (CLAUDE.md §14) требует: один основной
процесс на контейнер, закреплённые версии образов, health checks, non-root,
persistent volumes и документированный upgrade.

## Решение

Docker Compose — основной и единственный обязательный способ production-установки:

- `infra/compose/compose.prod.yaml` — production-профиль: proxy, web, api,
  worker, scheduler, reverb, postgres, redis, typesense, опциональный minio;
- `infra/compose/compose.dev.yaml` — dev-профиль (инфраструктурные сервисы для
  локальной разработки без сборки образов приложения);
- `infra/compose/compose.override.example.yaml` — документированные примеры
  переопределений (порты, ресурсы, внешние БД);
- все параметры — через `infra/compose/.env.example`;
- контейнерный runtime отвечает за restart policy и health checks; один
  основной процесс на контейнер;
- Supervisor-конфиги (`infra/supervisor/`) входят в bundle для поддерживаемого
  Linux/VM-профиля без Docker (ADR-009, CLAUDE.md §14), но не используются
  внутри контейнеров.

## Альтернативы

- **Kubernetes/Helm** — отвергнуто как обязательный способ: избыточная
  операционная сложность для целевой аудитории self-hosted; явно вне MVP.
- **Bare-metal инструкция (systemd/Supervisor) как основной способ** —
  отвергнуто: воспроизводимость окружения хуже, матрица дистрибутивов растёт;
  остаётся поддерживаемым вторичным профилем через `infra/supervisor/`.
- **Единый «all-in-one» контейнер** — отвергнуто: нарушает «один процесс на
  контейнер», усложняет масштабирование worker'ов и graceful reload.

## Последствия

- Релиз обязан публиковать закреплённые по версии образы и compose bundle.
- Upgrade-процедура описывается в `docs/operations/upgrade.md` в терминах
  `docker compose pull && up -d` + миграции + graceful reload (задача 2.6).
- CI проверяет `docker compose config` для обоих профилей.

## Критерии пересмотра

- Появление клиентов с обязательным требованием Kubernetes → отдельный
  Helm-chart как дополнительный артефакт (новый ADR).
- Рост числа процессов или требований к автоскейлингу, которые Compose не
  покрывает.
