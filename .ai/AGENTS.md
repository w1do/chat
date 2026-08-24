# AGENTS — Project Conventions and Skills

This file is the single entry point for an agent working on this project. It contains mandatory rules and a catalog of all skills from `~/shared-skills/laravel/**`. Full versions of each skill's rules can be found in its respective `SKILL.md` (paths are provided in each section).

---

## Tech Stack

- **Backend**: PHP 8.5, Laravel 13, Sanctum 4, Horizon 5, Pail 1, Larastan 3, Pint 1.
- **Frontend**: Inertia v2 + React 19 + TypeScript, Tailwind CSS v4, Ziggy 2.
- **Admin**: Livewire 3 + Filament v4.
- **Testing**: Pest 4 / PHPUnit 12.
- **AI/RAG**: Qdrant (`hkulekci/qdrant`), Polza AI, SerpApi, LLM orchestration (`theodo-group/llphant`).
- **Data**: DTOs via `spatie/laravel-data`, Money VO (integers/kopecks).
- **Architecture**: DDD + CQRS, Layered (Presentation, Application, Domain, Infrastructure).

---

## Mandatory Project Rules

### 1. Development Environment
- **Sail-Only**: All `artisan`, `php`, `composer`, and `npm` commands must be executed via `./vendor/bin/sail ...`.
- **Pre-submit Checks**: Before finishing any task, you MUST run:
  - `./vendor/bin/sail pint --dirty --format agent`
  - `./vendor/bin/sail php vendor/bin/phpstan analyse --memory-limit=2G`
  - All tests must pass: `./vendor/bin/sail test --compact`

### 2. Architecture (DDD + CQRS)
- **Four-Layer Structure**:
    - `Presentation`: Controllers (thin), Requests, Resources, Inertia Pages.
    - `Application`: Actions, Use cases, Commands/Handlers, Queries, DTOs.
    - `Domain`: Models (rich), Value Objects (Money), Enums, Contracts, Domain Events.
    - `Infrastructure`: External service implementations, Repositories, Providers.
- **DTOs**: Use typed DTOs (`spatie/laravel-data`) for all data transfer between layers. Avoid raw arrays.
- **Thin Controllers**: Controllers should only handle request input and return responses/renders. All logic belongs in the Application or Domain layers.

### 3. Security Hardening
- **Access Control**: Use Sanctum abilities (e.g., `assistants:ask`) and ensure strict record ownership checks (tenancy/isolation).
- **No Debug Routes**: Never add debug-only routes or commands. Use `PasswordReset` or formal tools instead.
- **Safe Errors**: In production, exceptions must return a UUID `error_id`. Never leak raw exception messages or stack traces to the frontend.
- **Rate Limiting**: Apply rate limits to all public and paid AI endpoints.

### 4. Data Integrity
- **Money Value Object**: All currency fields MUST use integers (e.g., kopecks/cents). Never use floats for money.
- **Transactions**: Use database transactions for all multi-step persistence logic.
- **Concurrency**: Use `lockForUpdate()` for operations that modify sensitive balances or state to prevent race conditions.
- **Transactional Outbox**: Use an outbox pattern for reliable cross-domain event publishing.

### 5. Workflow & Documentation
- **Automatic Tracking**: Update `removed.txt` in the root for every new business logic path (domains, controllers, etc.) as part of the documentation step.
- **Documentation**: After every feature/fix/refactoring, update the relevant docs using the `documentation` skill. For APIs, maintain Swagger/OpenAPI annotations.
- **Testing**: New features or bug fixes MUST include tests (Pest). Do not delete or disable existing tests.

### 6. Project Management (YouTrack MCP)
- **MCP Tool Trigger**: YouTrack is integrated as an MCP server. You MUST trigger YouTrack MCP tools for every significant action:
    - **Before starting**: Create or find a card, set status to "In Progress".
    - **During development**: Record every refactoring, feature, or fix immediately.
    - **Upon completion**: Update the card with detailed results and set status to "Done".
- **Mandatory Task Tracking**: Always use YouTrack to manage project cards and track the full project lifecycle.
- **Status Reporting**: Update the status of completed cards after each process, detailing all actions performed.
- **Granular Logging**: For new projects, immediately record every single change, including refactorings, new features, and bug fixes.
- **Single Source of Truth**: YouTrack is the mandatory system for task management and process documentation.

---

## Project Skills (`~/shared-skills/laravel/**`)

Consult this catalog before starting a task. If the task falls within a skill's domain, open its `SKILL.md` and follow it strictly.

### Architecture and Code Standards

#### `architecture-ddd` — Layered DDD Architecture
Full version: `~/shared-skills/laravel/architecture-ddd/SKILL.md`. Trigger: Designing structure or placing classes in layers.
- Layers: Presentation (Controllers, Requests), Application (Actions, DTOs, Commands), Domain (Models, VOs, Events), Infrastructure (External services, Repositories).
- Principles: Dependency Inversion, thin controllers, rich domain models, single responsibility.

#### `refactoring-ddd` — Refactoring to DDD/CQRS/DTO
Full version: `~/shared-skills/laravel/refactoring-ddd/SKILL.md`. Trigger: "refactor", bringing legacy code to the current architecture.
- Process: Cover with tests → extract DTOs → move logic to Actions/Handlers → simplify controllers → update Swagger → run Pint/PHPStan/Pest.

#### `dtos` — DTOs via `spatie/laravel-data`
Full version: `~/shared-skills/laravel/dtos/SKILL.md`. Trigger: Creating DTOs, validation, or response transformations.
- Extend `Spatie\LaravelData\Data`, use constructor property promotion, and validate via attributes (`#[Email]`, `#[Min]`).
- Use as Requests (auto-validation) and Responses (replaces API Resources).

#### `spatie-laravel-php` — Laravel/PHP Standards
Full version: `~/shared-skills/laravel/spatie-laravel-php/SKILL.md`. Trigger: Any `.php` or `.blade.php` code.
- Laravel conventions first, then PSR-12. Strict typing, early returns, constructor promotion, happy path at the end.
- kebab-case URLs, camelCase route names, plural controllers, `config()` over `env()`.

#### `spatie-javascript` — JS/TS Standards
Full version: `~/shared-skills/laravel/spatie-javascript/SKILL.md`. Trigger: `.js`, `.ts`, `.tsx` code.
- 4-space indent, single quotes, `const` over `let`, `===`, arrow functions for callbacks, destructuring.

### Documentation

#### `documentation` — Mandatory Documentation
Full version: `~/shared-skills/laravel/documentation/SKILL.md`. Trigger: After any completed task, before submission.
- Maintain `SUMMARY.md`, `README.md`, and specific `docs/*.md` files.
- Use Swagger attributes in controllers for API documentation; generate via `php artisan l5-swagger:generate`.

### Frontend and Design

#### `source-copy` — Copying layout from `source/`
Full version: `~/shared-skills/laravel/source-copy/SKILL.md`. Trigger: "transfer page/block from `source/`".
- **Strict UI-copy**: Do not change layout, classes, or behavior unless requested. Block-by-block transfer.
- Adapt to React/TSX: `class` -> `className`, absolute paths for assets, use Inertia `useForm`.

#### `design-prototype` — NeuralFlow AI/RAG Prototyping
Full version: `~/shared-skills/laravel/design-prototype/SKILL.md`. Trigger: Prototyping interactive interfaces for AI services.
- Focus on transparency (visualizing Thinking Trace) and industrial precision.
- Style: Glassmorphism, "Neural Gold" (#C8A645) accents, `backdrop-blur`.

### Access and Data

#### `laravel-permission-development` — Roles and Permissions (`spatie/laravel-permission`)
Full version: `~/shared-skills/laravel/laravel-permission-development/SKILL.md`. Trigger: Auth, roles, permissions.
- Check permissions, not roles. Use `HasRoles` trait, `$user->can()`, and Enums for permission names.

#### `sluggable-development` — Slugs (`spatie/laravel-sluggable`)
Full version: `~/shared-skills/laravel/sluggable-development/SKILL.md`. Trigger: Slugs, permalinks, self-healing URLs.
- `HasSlug` trait, `getSlugOptions()`, self-healing yields `slug-id` with 308 redirects.

#### `lazychaser-laravel-nestedset` — Hierarchies (`kalnoy/nestedset`)
Full version: `~/shared-skills/laravel/lazychaser-laravel-nestedset/SKILL.md`. Trigger: Trees, categories, menus.
- `NodeTrait`, use transactions for structural changes, `toTree()`, `fixTree()`.

#### `medialibrary-development` — Media Files (`spatie/laravel-medialibrary`)
Full version: `~/shared-skills/laravel/medialibrary-development/SKILL.md`. Trigger: File uploads, image conversions.
- `HasMedia` + `InteractsWithMedia`, `registerMediaCollections()`, responsive images via conversions.

#### `laravel-activitylog` — Activity Logging (`spatie/laravel-activitylog`)
Full version: `~/shared-skills/laravel/laravel-activitylog/SKILL.md`. Trigger: Auditing model changes or user actions.
- `LogsActivity` trait, `getActivitylogOptions()`, `logOnlyDirty`.

#### `laravel-query-builder` — API Filtering/Sorting (`spatie/laravel-query-builder`)
Full version: `~/shared-skills/laravel/laravel-query-builder/SKILL.md`. Trigger: API endpoints with filters/sorts.
- `QueryBuilder::for()`, explicitly allow filters/sorts/includes.

#### `laravel-package-tools` — Building Laravel Packages
Full version: `~/shared-skills/laravel/laravel-package-tools/SKILL.md`. Trigger: Developing custom packages/providers.
- `PackageServiceProvider`, `configurePackage()` with `hasMigration`, `hasConfigFile`, etc.

### Billing and Payments

#### `moffhub-billing` — Subscriptions and Feature Gating
Full version: `~/shared-skills/laravel/moffhub-billing/SKILL.md`. Trigger: Plans, feature gating, metering.
- `Billable` trait, check `hasFeature`, middleware `feature:`, usage metering via `UsageService`.

#### `laravel-plans` — Plans and Limits (`rennokki/plans`)
Full version: `~/shared-skills/laravel/laravel-plans/SKILL.md`. Trigger: SaaS plans with countable limits. ⚠️ Legacy reference.
- `HasPlans` trait, `consumeFeature`, subscriptions and recurrency.

#### `payment-platega-integration-laravel` — Payment Integration Blueprint
Full version: `~/shared-skills/laravel/payment-platega-integration-laravel/SKILL.md`. Trigger: Money deposits, adding payment providers.
- Gateway factory pattern, balance credited only on `CONFIRMED` webhook, amounts in kopecks (integers).

#### `platega` — Platega.io API Reference
Full version: `~/shared-skills/laravel/platega/SKILL.md`. Trigger: Specific Platega endpoint details.
- Transaction ID generation, webhook verification, status lifecycle.

### AI

#### `polza-ai` — Polza AI API
Full version: `~/shared-skills/laravel/polza-ai/SKILL.md`. Trigger: Transcription and embeddings.
- Transcription and embeddings guidelines for RAG.

#### `serp-api` — SerpApi Search Results
Full version: `~/shared-skills/laravel/serp-api/SKILL.md`. Trigger: Scraping search results (Google, Bing).
- Use `serpapi/google-search-results-php`, global API key, and `GoogleSearch` class.

### Admin Panel

#### `olakunlevpn-filament-skills` — Filament v4 Standards
Full version: `~/shared-skills/laravel/olakunlevpn-filament-skills/SKILL.md`. Trigger: Filament resources, forms, tables.
- Delegate schemas to separate classes, use Heroicons, implement `HasLabel` for Enums.

### Deploy and Infrastructure

#### `laravel-deploy` — Deployment and Docker
Full version: `~/shared-skills/laravel/laravel-deploy/SKILL.md`. Trigger: Docker builds, production config.
- Multi-stage builds, production caching, Supervisord for Horizon/queues.

### Versioning and Security

#### `spatie-version-control` — Git Conventions
Full version: `~/shared-skills/laravel/spatie-version-control/SKILL.md`. Trigger: Commits, branching, PRs.
- Present tense commits, focused branches, rebase/squash workflows.

#### `spatie-security` — Security Standards
Full version: `~/shared-skills/laravel/spatie-security/SKILL.md`. Trigger: Security reviews, HTTPS, CSRF.
- HTTPS everywhere, 2FA, limit DB permissions, secure secret management.

### Maintenance

#### `clean-project` — Project Skeleton Cleanup
Full version: `~/shared-skills/laravel/clean-project/SKILL.md`. Trigger: `/clean-development` command.
- **`removed.txt` Tracking**: Always record new logic paths in `removed.txt` during documentation steps.
- Algorithm for stripping business logic while keeping the core (Auth, Profile, Dashboard).
