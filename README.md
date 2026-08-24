# Self-Hosted AI Chat

Коммерчески готовый self-hosted чат: комнаты, real-time сообщения, уведомления
и AI-инструменты редактирования текста. Модульный монолит: Laravel 13 (API-only,
Octane, Reverb, Horizon) + React SPA, PostgreSQL, Redis, Docker Compose.

Состояние проекта — в [SUMMARY.md](SUMMARY.md). Проект на раннем этапе:
реализован каркас монорепозитория; функциональные модули — `planned`.

## Архитектура

Package-first монорепозиторий: приложения в `apps/*` — тонкие composition
roots, вся бизнес-логика — в переиспользуемых пакетах `packages/backend/*`
и `packages/frontend/*`.

Файловая раскладка описана в [STRUCTURE.md](STRUCTURE.md) — единственном
источнике истины по размещению кода. Правила разработки — в [CLAUDE.md](CLAUDE.md).

## Быстрый старт (разработка)

Требования: PHP ≥ 8.4, Composer 2, Node.js ≥ 22, pnpm 9.

```bash
# Backend API
cd apps/chat-api
composer install
cp .env.example .env && php artisan key:generate
php artisan serve

# Frontend
pnpm install          # из корня репозитория
./tools/chat web dev  # dev-сервер Vite
```

## Быстрый старт (production, Docker Compose)

```bash
cd infra/compose
cp .env.example .env   # заполните секреты
docker compose --env-file .env -f compose.prod.yaml up -d
```

Полная процедура — [docs/operations/installation.md](docs/operations/installation.md);
обновление — [docs/operations/upgrade.md](docs/operations/upgrade.md).

## Команды

Единая точка входа — `./tools/chat`:

```text
./tools/chat api <artisan…>      artisan в apps/chat-api
./tools/chat web <script>        pnpm-скрипт в apps/chat-web (typecheck, build)
./tools/chat test api            тесты приложения (Pest)
./tools/chat test packages       изолированные тесты backend-пакетов
./tools/chat check boundaries    проверка границ пакетов
./tools/chat contracts validate  валидация JSON Schema real-time событий
./tools/chat smoke search        индексация и поиск в настоящем Typesense
./tools/chat api chat:grant-admin <логин>   назначить администратора
./tools/chat lint | stan         Pint / PHPStan
```

Поиск по сообщениям выключен по умолчанию: чат работает без Typesense. Как
включить и перестроить индекс — [docs/operations/search-reindex.md](docs/operations/search-reindex.md).

## Документация

- [STRUCTURE.md](STRUCTURE.md) — раскладка монорепозитория;
- `docs/features/` — спецификации функций со статусами;
- `docs/api/` — правила HTTP API и real-time контрактов;
- `docs/operations/` — установка, backup, обновление;
- `docs/security/` — threat model и hardening;
- `docs/decisions/` — ADR.
