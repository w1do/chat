## Context

See `proposal.md` — Why. This change supersedes `plan-self-hosted-chat-roadmap`: its Stage 1 groundwork (monorepo skeleton, `./tools/chat`, env examples, doc stubs) is the starting state. The authoritative file-level layout is `STRUCTURE.md`; the architectural rules come from `CLAUDE.md`. The technical decisions of the previous design remain valid and are inherited unchanged: single Laravel composition root (`apps/chat-api`) plus package-first domains; lightweight CQRS with direct DI-invoked handlers; PostgreSQL as source of truth with Typesense as a rebuildable index; broadcast/notify/index only after commit; presence separate from preferences; Polza behind `TextRevisionProvider`; Compose and Supervisor with distinct supported roles; contracts (OpenAPI + event schemas) before clients depend on them.

This design adds what the rebuild requires: file-placement discipline, vertical slices that include the frontend, and per-stage documentation gates.

## Goals / Non-Goals

**Goals:**

- Every task names concrete files placed exactly per `STRUCTURE.md` §2–§6 and the §9 placement matrix.
- Every feature stage ships backend package + OpenAPI/client + frontend package UI wired into `apps/chat-web` in the same stage.
- Every stage ends with a documentation gate: `docs/*` file with status, module row in `SUMMARY.md`, `README.md` and `CHANGELOG.md` updates.
- Resolve `STRUCTURE.md` §10 open questions as recorded working assumptions.

**Non-Goals:**

- No re-decision of the inherited architecture choices listed in Context.
- No `admin-api` / `admin-web` applications in MVP (assumption 5 below).
- No implementation in this change — planning artifacts only.

## Decisions

### 1. STRUCTURE.md §10 assumptions fixed for planning

Each becomes an ADR during implementation, but the plan assumes:

1. **`packages/contracts`** exists as a language-neutral package of JSON Schemas for versioned WebSocket events; PHP broadcast classes and TypeScript event types reference these schemas, and contract tests validate payloads against them. Alternative (schemas inside each backend package) rejected: the frontend chat package needs one import point (`realtime/eventMap.ts` types come from `packages/contracts`).
2. **`users` owned by `identity`**: the package ships the table migration and a base model; `apps/chat-api/app/Models/User.php` extends it and is injected via `config('identity.user_model')`. Other packages depend on the `Actor` contract from `shared-kernel`, never on the concrete class.
3. **Runtime SPA config via `public/config.json`** rendered from `config.template.json` by the web container entrypoint (Reverb address, AI enablement flag, branding). Rejected alternative `GET /api/v1/config` stays open as a later ADR revision criterion; `runtime-config.ts` isolates the choice.
4. **Octane server** stays deferred to ADR-009; the plan requires Octane safety and reload semantics, not a specific server. `infra/docker/api/Dockerfile` and `infra/supervisor/octane.conf` are written when ADR-009 lands (Stage 2).
5. **No `admin-api`/`admin-web` in MVP**; administration is API endpoints in `packages/backend/administration` plus admin-only React screens in `chat-web`.
6. **Presence**: Redis-backed `PresenceRegistry` in the chat package (per `STRUCTURE.md` §3) is the source of truth for "active in room" used by notification routing; Reverb presence channels feed it but are not the authority. Rejected alternative (Reverb channels as authority) couples notification correctness to socket lifecycle.

### 2. Vertical slice definition per feature stage

A feature stage is complete only when all of these exist, in `STRUCTURE.md` locations:

1. Backend package code: migrations, Domain, Application (Command/Query + Handler), Infrastructure, Presentation, package tests (Testbench).
2. App integration: route wiring, `channels.php` entries, `PackageWiringProvider` links, integration/contract tests in `apps/chat-api/tests`.
3. Contract: package `openapi/paths|schemas` fragments, rebuilt `openapi/dist/openapi.json`, regenerated `packages/frontend/api-client` with no diff, event schemas in `packages/contracts` when real-time is touched.
4. Frontend: components/hooks in the feature's `packages/frontend/<pkg>/src`, composed into `apps/chat-web` (router/pages/providers), with component tests and typecheck.
5. Documentation gate (Decision 3).

Search UI lives in `packages/frontend/chat` (search is a chat feature view); backend search code lives in `packages/backend/chat/src/Infrastructure/Search/` — `STRUCTURE.md` shows no separate search package and creating one would add a boundary without a second consumer.

### 3. Documentation gate as an explicit task in every stage

Each stage's final task updates, atomically with the stage:

- `docs/features/<feature>.md` (or `docs/operations/*`, `docs/api/*` for infra/contract stages) — scenarios, permissions, API, events, edge cases, acceptance criteria, and a status line; `implemented` only with code+tests present, `verified` only after the stage's smoke/E2E command passes.
- `SUMMARY.md` — a module table row: module, one-line "what was done", status.
- `README.md` — quick start, commands, and architecture pointers affected by the stage (architecture section links to `STRUCTURE.md`, never duplicates the tree).
- `CHANGELOG.md` — Keep a Changelog entry under `[Unreleased]` per stage.

Rationale: the user requires transparent per-stage documentation; making it a checkbox task inside each stage (not a global final stage) keeps `SUMMARY.md` truthful at every commit.

### 4. Stage ordering

Foundation-alignment → runtime → contracts baseline → identity → rooms/messages → real-time → notifications → search → AI → administration → hardening/release. Same dependency logic as the previous plan, but Stage 1 becomes "align existing skeleton to STRUCTURE.md" (the skeleton exists) and every feature stage from identity onward carries its frontend slice instead of deferring UI.

## Risks / Trade-offs

- [Vertical slices make stages heavier] → Each stage's task list is file-granular so progress is visible; backend/frontend halves within a stage can be committed separately as long as the stage's docs gate closes the stage.
- [File-explicit tasks drift if STRUCTURE.md changes] → `STRUCTURE.md` states instruction-over-structure precedence; any divergence found during implementation updates `STRUCTURE.md` first, then tasks.
- [Existing scaffolding from the old change may not match STRUCTURE.md] → Stage 1 includes an explicit conformance audit and moves/renames (e.g., current `infra/docker/api-entrypoint.sh`, `api.Dockerfile` flat files vs. `infra/docker/api/` directories).
- [Docs gate can rot into checkbox theater] → Statuses are testable: CI grep forbids `implemented`/`verified` in a feature doc when the module's test command is absent/failing (hardening stage adds this check).
- [Inherited risks] → Octane state leaks, notification duplication, presence staleness, Typesense outage, AI cost/privacy: mitigations unchanged from the superseded design (sequential multi-user Octane tests, idempotent jobs with grouping windows, presence TTLs, reindex + degraded response, quotas/fakes/disable switch).

## Migration Plan

Planning-only change. Implementation proceeds stage by stage per `tasks.md`; after each stage, run the stage validation command and close the documentation gate. The superseded change `plan-self-hosted-chat-roadmap` should be archived or abandoned once this change is approved, so a single active roadmap remains. Post-release database changes use forward migrations only.

## Open Questions

- Exact notification grouping windows, AI quotas, and Typesense ranking fields are decided during their stages without changing capability boundaries.
- Whether `public/config.json` is later replaced by `GET /api/v1/config` is an ADR revision criterion, isolated behind `runtime-config.ts`.
