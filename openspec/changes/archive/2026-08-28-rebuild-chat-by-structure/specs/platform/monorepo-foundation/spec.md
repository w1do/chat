## Purpose

Defines the repository foundation for a package-first self-hosted chat monorepo so backend, frontend, infrastructure, documentation, and local tooling can evolve in small verified stages.

## ADDED Requirements

### Requirement: Monorepo layout is initialized
The repository SHALL contain the agreed top-level application, package, infrastructure, documentation, CI, and project metadata directories for the self-hosted chat product.

#### Scenario: Fresh checkout exposes expected roots
- **WHEN** a developer lists the repository root
- **THEN** `apps`, `packages`, `infra`, `docs`, `.github/workflows`, `README.md`, `SUMMARY.md`, `CHANGELOG.md`, `AGENTS.md`, and `CLAUDE.md` are present or explicitly stubbed with documented status

### Requirement: Backend packages have package boundaries
Each backend domain package SHALL have its own package metadata, service provider, source tree, configuration area, migrations, OpenAPI fragments, and isolated tests.

#### Scenario: Backend package boundary review
- **WHEN** a backend package is inspected
- **THEN** it declares a public namespace and does not require consumers to copy migrations, routes, config, or internal classes into an application root

### Requirement: Frontend packages have public entrypoints
Each frontend package SHALL expose typed public entrypoints and declare peer dependencies instead of importing from application source folders.

#### Scenario: Frontend package boundary review
- **WHEN** a frontend feature package is inspected
- **THEN** it exposes its supported components, hooks, schemas, or adapters through public exports and has no deep import from `apps/*`

### Requirement: Local tool wraps service commands
The repository SHALL provide `./tools/chat` as the supported local command for project lifecycle, validation, and service operations.

#### Scenario: Tool help is available
- **WHEN** a developer runs `./tools/chat help`
- **THEN** the tool lists commands for setup, start, stop, restart, logs, status, shell, tests, static analysis, OpenAPI/client generation, and smoke checks

### Requirement: Environment examples are complete
The repository SHALL provide environment examples for local and production-like Compose profiles without committing secrets.

#### Scenario: Environment template review
- **WHEN** a developer reviews the environment examples
- **THEN** required variables for application URLs, database, Redis, Reverb, Horizon, Typesense, SMTP, storage, Polza AI, CORS, trusted proxies, and health checks are documented with safe placeholder values


### Requirement: Repository layout conforms to STRUCTURE.md
The repository SHALL place applications, packages, infrastructure, and documentation files according to the layout contract in `STRUCTURE.md`, and composition roots SHALL NOT contain domain or application business logic.

#### Scenario: Layout conformance review
- **WHEN** the repository tree is checked against `STRUCTURE.md`
- **THEN** no `Domain/` or `Application/` code exists under `apps/*`, package migrations are loaded by their providers rather than copied into applications, and no prohibited layout item from `STRUCTURE.md` §9 is present

### Requirement: Documentation reflects implementation status per stage
The repository SHALL update, in the same stage that changes behavior: the affected `docs/*` document with an explicit status (`planned`, `in progress`, `implemented`, `verified`), the per-module status entry in `SUMMARY.md`, the `README.md` sections affected by the change, and a `CHANGELOG.md` entry.

#### Scenario: Stage completion documentation review
- **WHEN** a stage is declared complete
- **THEN** its module has a docs file with a truthful status, `SUMMARY.md` lists the module with a short summary of what was done and its status, and `README.md` and `CHANGELOG.md` contain the corresponding updates

#### Scenario: Unimplemented feature is not overstated
- **WHEN** documentation describes a capability whose code or tests are absent
- **THEN** that capability's status is `planned` or `in progress`, never `implemented` or `verified`
