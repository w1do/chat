# SUMMARY — текущее состояние проекта

Честное состояние на 2026-08-24. Статусы: `planned` / `in progress` /
`implemented` / `verified`. Статус `implemented` ставится только при наличии
кода и тестов в репозитории.

## Что сделано

Этап 1 roadmap (`openspec/changes/rebuild-chat-by-structure`): каркас
монорепозитория выровнен по `STRUCTURE.md` — composition roots `apps/chat-api`
(Laravel 13, Pest) и `apps/chat-web` (React 19, Vite, TypeScript strict),
скелеты шести backend-пакетов и шести frontend-пакетов, `packages/contracts`
с JSON Schema шести real-time событий, CLI `./tools/chat`, каркас `infra/`
и `docs/`, корневые composer/pnpm workspace с агрегирующими проверками.

## Модули

| Модуль | Что сделано | Статус |
|---|---|---|
| platform/monorepo-foundation | Каркас монорепозитория: apps, packages, contracts, tools/chat, boundary-check; app-тесты и typecheck проходят | in progress |
| operations/self-hosted-runtime | ADR-007/009; compose prod/dev (`docker compose config` ок); Dockerfiles api/web/proxy; Supervisor-конфиги (`supervisor check` ок); readiness `/api/v1/readiness` + `/up` со smoke-тестами; `deploy reload` в tools/chat. Не проверено: сборка образов и `smoke runtime` (docker daemon окружения недоступен) | in progress |
| contracts/api-and-realtime | `openapi.base.yaml`, каркас `build.php`, схемы-конверты 6 событий; полная сборка — этап 3 | planned |
| identity/authentication-and-profile | Скелет пакетов `backend/identity`, `frontend/identity` | planned |
| chat/rooms-and-messages | Скелет пакетов `backend/chat`, `frontend/chat` | planned |
| chat/realtime-presence | Скелеты broadcast/presence не начаты; схемы событий в `packages/contracts` | planned |
| notifications/offline-delivery | Скелет пакетов `backend/notifications`, `frontend/notifications` | planned |
| search/message-search | Не начато | planned |
| ai/text-revisions | Скелет пакета `backend/ai` | planned |
| administration/system-controls | Скелет пакета `backend/administration` | planned |

## Ограничения текущего состояния

- Endpoints, миграции доменов, real-time доставка и UI-функции отсутствуют —
  только каркас и контрактные заготовки.
- Изолированные testbench-тесты пакетов (кроме `shared-kernel`) требуют
  установки `orchestra/testbench` (недоступна в offline-окружении разработки
  на момент этапа 1).
- Docker/Compose/Supervisor и CI-workflows появятся на этапах 2 и 12.
