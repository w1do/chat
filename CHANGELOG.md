# Changelog

Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/);
версионирование — [SemVer](https://semver.org/lang/ru/).

## [Unreleased]

### Added

- Self-hosted runtime (этап 2 roadmap):
  - ADR-007 (Docker Compose как способ поставки) и ADR-009 (FrankenPHP как
    Octane application server);
  - `infra/compose/{compose.prod.yaml,compose.dev.yaml,compose.override.example.yaml}`
    с закреплёнными образами, health checks и одним процессом на контейнер;
  - multi-stage non-root образы `infra/docker/{api,web}/Dockerfile`, примеры
    reverse proxy `infra/docker/proxy/`;
  - Supervisor-конфиги `infra/supervisor/*` для Linux/VM-профиля;
  - liveness `/up` и readiness `/api/v1/readiness` (database, redis, queue,
    websocket, search — без секретов) со smoke-тестами;
  - команды `./tools/chat compose config | build images | supervisor check |
    deploy reload | smoke runtime`;
  - документация `docs/operations/{installation,configuration,supervisor,backup-restore,upgrade,troubleshooting}.md`.
- Каркас монорепозитория, выровненный по `STRUCTURE.md` (этап 1 roadmap
  `rebuild-chat-by-structure`):
  - `apps/chat-api` — Laravel 13 composition root: провайдеры
    (`PackageWiringProvider`, `BroadcastServiceProvider`), `app/Support/{ApiErrorEnvelope,TraceId}`,
    маршруты `api/channels/console`, каркас OpenAPI (`openapi.base.yaml`, `build.php`),
    тестовые сьюты `Integration/Contract/Smoke/Octane` (Pest);
  - `apps/chat-web` — React 19 composition root: `src/app/{providers,router,runtime-config,echo,query-client,permissions}`,
    страницы-заглушки, `public/config.template.json`, Playwright-плейсхолдеры `e2e/`;
  - скелеты backend-пакетов `shared-kernel` (идентификаторы, контракты, value objects),
    `identity`, `chat`, `notifications`, `ai`, `administration` (composer, ServiceProvider,
    config, testbench TestCase);
  - `packages/contracts` — JSON Schema шести версионированных real-time событий;
  - скелеты frontend-пакетов `tooling`, `ui`, `api-client`, `chat`, `identity`, `notifications`;
  - CLI `./tools/chat` (api, web, test, check boundaries, contracts validate, lint, stan);
  - корневые `composer.json` (path repositories, aggregate-скрипты), pnpm workspace,
    `pint.json`, `phpstan.neon`, каркас `infra/` и `docs/` со статусами `planned`.
