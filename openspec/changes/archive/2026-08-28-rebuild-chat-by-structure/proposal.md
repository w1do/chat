## Why

The implementation roadmap must be rebuilt to match the authoritative file-level layout in `STRUCTURE.md` (composition roots, package contracts, exact directory/file placement), and the previous plan deferred frontend work into late stages. Each stage must now be a full vertical slice — backend package code, frontend package/UI integration, and per-stage documentation — so every completed stage is user-visible, documented, and truthfully reflected in `SUMMARY.md`, `README.md`, and `CHANGELOG.md`.

## What Changes

- Rebuild the staged implementation plan so every file created by a stage lands exactly where `STRUCTURE.md` §1–§9 prescribes (apps as thin composition roots, `packages/backend/*` package contract, `packages/frontend/*` feature packages, `infra/*`, `docs/*`).
- Every stage is a vertical slice: backend package logic, API contract (OpenAPI + generated client), and the corresponding frontend package components/hooks integrated into `apps/chat-web` in the same stage — no backend-only stages except pure infrastructure.
- Every stage ends with a mandatory documentation gate: a `docs/features/<feature>.md` (or `docs/operations/*`/`docs/api/*`) file with explicit status (`planned` / `in progress` / `implemented` / `verified`), a per-module status line in `SUMMARY.md`, and updates to `README.md` and `CHANGELOG.md`.
- Stage task lists are broken down to concrete files, following the placement matrix in `STRUCTURE.md` §9 ("Куда класть новый код") and the prohibited-layout list ("Чего в дереве быть не должно").
- Resolve `STRUCTURE.md` §10 open questions as working assumptions recorded in design: `packages/contracts` as JSON Schema home for real-time events; `users` owned by `identity` with configurable model; runtime SPA config via `public/config.json`; no `admin-api`/`admin-web` in MVP; Redis presence registry in `chat` package.
- Carry forward previously agreed scope: Typesense-backed message search (as `Infrastructure/Search` in the chat package plus a search UI) and Polza as the AI provider behind `TextRevisionProvider`.
- Supersedes the plan in change `plan-self-hosted-chat-roadmap`; its completed Stage 1 groundwork is treated as the starting state.

## Capabilities

### New Capabilities

- `platform/monorepo-foundation`: Monorepo layout per `STRUCTURE.md`, backend/frontend package contracts, root tooling (`composer.json`, pnpm workspace, `./tools/chat`), environment examples, and boundary checks.
- `operations/self-hosted-runtime`: Docker Compose profiles, Dockerfiles, Supervisor configs, health/readiness endpoints, reverse proxy, and deploy reload behavior per `STRUCTURE.md` §6.
- `contracts/api-and-realtime`: `/api/v1` conventions, JSON error envelope, OpenAPI 3.1 assembly (`apps/chat-api/openapi/`), generated TypeScript client, and `packages/contracts` JSON Schemas for versioned WebSocket events.
- `identity/authentication-and-profile`: Registration, login, logout, password recovery, profile, Sanctum SPA auth, configurable user model, plus the identity frontend package (auth forms, guards) wired into `chat-web`.
- `chat/rooms-and-messages`: Rooms, membership roles, messages, replies, reactions, mentions, cursor pagination in the chat backend package, plus room/message UI components in the chat frontend package.
- `chat/realtime-presence`: Reverb channels, broadcast-after-commit versioned events, typing, Redis presence registry, and frontend Echo adapters with reconnect HTTP resync.
- `notifications/offline-delivery`: Preferences, presence-aware offline routing, dedup/grouping, queued database/email delivery, plus notifications frontend package (feed, preferences UI, counters).
- `search/message-search`: Typesense after-commit indexing, permission-scoped search API, reindex command, degraded fallback, plus room-scoped search UI.
- `ai/text-revisions`: Polza-backed draft revision operations behind `TextRevisionProvider`, quotas/timeouts/audit, plus the composer AI suggestion UI (suggest, never auto-publish).
- `administration/system-controls`: API-only settings, audit listing, AI disable switch, Horizon access gate, plus minimal API-backed React admin screens in `chat-web`.

### Modified Capabilities

- None (no main specs exist yet; all capabilities are introduced by this change).

## Impact

- Affected areas: `apps/chat-api`, `apps/chat-web`, `packages/backend/*`, `packages/frontend/*`, `packages/contracts`, `infra/*`, `docs/*`, `tools/chat`, root metadata (`README.md`, `SUMMARY.md`, `CHANGELOG.md`), `.github/workflows/*`.
- Planning impact: supersedes `plan-self-hosted-chat-roadmap`; new tasks are file-explicit against `STRUCTURE.md`.
- Runtime systems unchanged in kind: Laravel 13 + Octane, Reverb, Horizon, PostgreSQL, Redis, Typesense, Polza AI, Docker Compose, Supervisor.
- Documentation becomes a hard per-stage gate: `docs/*` file per module, module status table in `SUMMARY.md`, `README.md` architecture/quick-start updates, `CHANGELOG.md` entry per stage.
