# Skill: clean-project

This skill describes how to turn a **copy of the current project** into a clean "skeleton" (boilerplate) for starting a new project: removing all business logic and related dependencies while **preserving working authentication and dashboard entry**.

> Scenario: The user copied the entire project folder to a new one and runs the `/clean-development` command. The agent must identify which files and dependencies to remove, gather the complete list in `removed.txt`, and then, upon confirmation, clean the project, leaving only the requested core (default: authentication and dashboard).

---

## 0. Trigger Command: `/clean-development`

The skill is activated by the command:

```
/clean-development [what to keep]
```

- **Without arguments** — Keep only the **base core**: authentication, login/registration, password recovery, profile, empty Dashboard, layouts, and base UI components.
- **With arguments** — Additionally keep the **listed domains/pages**. Examples:
  - `/clean-development` → Keep only auth and dashboard.
  - `/clean-development keep billing and tariffs` → Core + `Billing` domain + tariffs page.
  - `/clean-development keep referral` → Core + `Referral` domain.

If the request is ambiguous, ask **one clarifying question** before building the list.

---

## 0.1. Automatic `removed.txt` Maintenance (Always On)

This mode is **always active** and works without calling `/clean-development`. The goal is for `removed.txt` to populate itself as features are developed, so by the time the project needs cleaning, the list of business logic paths is already ready.

**When it triggers:** Every time a feature/fix/refactoring **creates or touches business logic files** (new domain, controller, page, component, migration, route, provider, dependency, etc.). This is part of the documentation step: along with updating documentation (skill `documentation`), the agent appends new feature paths to `removed.txt`.

**Algorithm for auto-maintenance:**
1. Identify which of the created/modified files belong to **business logic** (exclude core/auth files).
2. If `removed.txt` doesn't exist at the root, create it with the standard header.
3. **Append** new paths to the appropriate sections of `removed.txt`. Group by layers.
4. **Idempotency:** Do not add duplicates. Record directories with a trailing `/`.
5. If the feature added references to remaining (core) files — `routes/web.php`, `bootstrap/providers.php`, layouts, menus, `DatabaseSeeder.php` — record these in the **"Files to PATCH"** section with a note on what to clean up later.
6. If the feature introduced a new composer/npm dependency used only by this feature, add it to the dependency section.

**Important:**
- In auto-mode, **nothing is deleted** — only paths are recorded. Actual deletion only happens via the `/clean-development` command with confirmation.
- Core files (auth, profile, roles/permissions, system migrations, base layouts/UI) are **never** recorded in `removed.txt`.

---

## 1. What ALWAYS Remains (Core — Do Not Delete)

This is the minimal functional skeleton: "Auth + Dashboard".

### Backend
- `app/Domain/User/**` — User domain layer.
- `app/Domain/Authorization/**` — Roles and permissions.
- `app/Domain/Shared/**` — **Except** `app/Domain/Shared/AI/**` (AI is business logic). Keep shared helpers/base classes.
- `app/Http/Controllers/Auth/**` — Auth controllers (Breeze).
- `app/Http/Controllers/User/ProfileController.php` — Profile editing.
- `app/Http/Controllers/Controller.php` — Base controller.
- `app/Http/Requests/Auth/**` — Auth form validation.
- `app/Http/Middleware/**` — System middleware.
- `app/Models/User.php` — User model.
- `app/Providers/AppServiceProvider.php` — Base provider.
- `routes/auth.php` — Auth routes.
- `routes/console.php` — Framework console commands.

### Frontend (`resources/js`)
- `resources/js/Pages/Auth/**` — Auth pages.
- `resources/js/Pages/Profile/**` — Profile pages.
- `resources/js/Pages/Dashboard.tsx` — **Keep, but clear** to an empty dashboard stub.
- `resources/js/Layouts/AuthenticatedLayout.tsx` and `GuestLayout.tsx` — Clean menus of deleted section links.
- `resources/js/Components/**` — Base reusable UI components (`PrimaryButton`, `Modal`, `Dropdown`, `NavLink`, etc.). Business-specific components (e.g., `VoiceRecorder`, `Faq`, `Hero`) go to the removal list.
- `resources/js/app.tsx`, `bootstrap.ts`, `ssr.tsx`, `lib/**`, `types/**` — Keep (after cleaning broken imports).

### Database (`database/migrations`) — System and Auth
- `create_users_table.php`, `create_cache_table.php`, `create_jobs_table.php`.
- `create_personal_access_tokens_table.php` (Sanctum).
- `create_roles_table.php`, `create_permissions_table.php`, etc.
- Corresponding factories/seeders in `database/factories`, `database/seeders`.

### Configuration and Infrastructure
- `config/**`, `bootstrap/**`, `public/**`, `phpunit.xml`, `vite.config.js`, etc. — **Do not delete files**; patch contents (providers, dependencies).
- Guide files: `AGENTS.md`, `DESIGN_UI.md`, `.ai/skills/**` — Keep.

---

## 2. What is DELETED by Default (Business Logic)

Everything related to the current project's specific domain (RAG / assistants / billing).

### Domain Modules (`app/Domain/*`)
Delete entirely (unless explicitly kept):
- `Assistant`, `Knowledge`, `Chat`, `Connector`, `Content`, `Billing`, `Payment`, `BonusCode`, `Referral`, `Admin`, `ActivityLog`, `Shared/AI`.

### Controllers / Requests / Resources (`app/Http/**`)
Delete everything serving business domains.

### MCP / Queues / External Services
- `app/Mcp/**`, `routes/ai.php`.
- `PaymentServiceProvider`, `HorizonServiceProvider` (if billing/queues are removed).

### Frontend (`resources/js/Pages`)
Delete business section pages: `Assistants`, `Chat`, `Finance`, `Referral`, `Tariffs`, etc.

### Migrations / Factories / Seeders / Tests
Delete all business table migrations and related files.

### Dependencies (composer.json / package.json)
Candidates for removal: `hkulekci/qdrant`, `theodo-group/llphant`, `moffhub/billing`, `filament/filament`, `spatie/laravel-activitylog`, `laravel/horizon`, `laravel/mcp`, `darkaonline/l5-swagger`.

---

## 3. Execution Algorithm for `/clean-development`

### Step 1. Define Retention Scope
1. Parse command arguments. Form `KEEP = Core + requested domains`.
2. Everything else → `REMOVE`.

### Step 2. Scan Project and Gather Dependencies
1. Traverse directories to find removal candidates.
2. Find **back-references** (imports, registrations, routes, menu links) in remaining files. Mark these for **patching**.
3. Identify "orphaned" dependencies.

### Step 3. Generate `removed.txt`
Create `removed.txt` at the root containing:
- List of files/directories to delete.
- List of dependencies to remove.
- List of files to **patch** (what exactly to clean).
- Commands to apply the changes.

### Step 4. Apply Cleaning (After Confirmation)
1. Delete files and directories in `REMOVE`.
2. Edit remaining files to remove broken links (routes, providers, menus, seeders).
3. Remove dependencies via `composer remove` and `npm uninstall`.

### Step 5. Verify Functional Skeleton
Using Sail:
1. `composer install` and `npm install` pass.
2. `migrate:fresh` leaves only core tables.
3. `npm run build` passes without broken imports.
4. `artisan test --compact` passes for core auth.

### Step 6. Documentation
Document that the project has been brought to a clean skeleton using the `documentation` skill. Leave `removed.txt` as a report.

---

## 4. Hard Rules

- ❌ Do not delete Core (Section 1).
- ❌ Do not delete infrastructure files — only patch contents.
- ❌ Do not delete `.ai/skills/**` or project guides.
- ❌ Do not disable auth tests. Fix them.
- ✅ `removed.txt` and confirmation first, then deletion.
- ✅ Execute all commands via Sail (`./vendor/bin/sail ...`).

---

## 5. `removed.txt` Format

A flat, readable list. Example structure:

```text
# removed.txt — project cleaning plan (/clean-development)
# Kept (core): authentication, profile, roles/permissions, dashboard (empty)
# Additionally kept: <list of requested domains or "none">

## Directories for removal (business domains)
app/Domain/Assistant/
app/Domain/Knowledge/
app/Domain/Chat/
app/Domain/Connector/
app/Domain/Content/
app/Domain/Billing/
app/Domain/Payment/
app/Domain/BonusCode/
app/Domain/Referral/
app/Domain/Admin/
app/Domain/ActivityLog/
app/Domain/Shared/AI/
app/Mcp/

## Controllers / Requests / Resources for removal
app/Http/Controllers/Assistant/
app/Http/Controllers/Chat/
app/Http/Controllers/Connector/
app/Http/Controllers/Content/
app/Http/Controllers/Payment/
app/Http/Controllers/Admin/
app/Http/Controllers/User/BillingController.php
app/Http/Controllers/User/BonusCodeController.php
app/Http/Controllers/User/FinanceController.php
app/Http/Controllers/User/TariffController.php
app/Http/Controllers/User/ReferralController.php
app/Http/Controllers/ApiDoc.php

## Frontend for removal
resources/js/Pages/Assistants/
resources/js/Pages/Chat/
resources/js/Pages/Chats/
resources/js/Pages/Connectors/
resources/js/Pages/Content/
resources/js/Pages/Bots.tsx
resources/js/Pages/Competitors.tsx
resources/js/Pages/Monitoring.tsx
resources/js/Pages/Finance.tsx
resources/js/Pages/Referral.tsx
resources/js/Pages/ShareChat.tsx
resources/js/Pages/Tariffs.tsx
resources/js/Components/<business-components>

## Migrations / Factories / Seeders / Tests for removal
database/migrations/2026_06_25_*  ... (business tables)
database/factories/<business>
database/seeders/<business>
tests/**/<business>

## Routes
routes/ai.php

## Composer dependencies for removal
hkulekci/qdrant
theodo-group/llphant
moffhub/billing
filament/filament
spatie/laravel-activitylog
laravel/horizon
laravel/mcp
darkaonline/l5-swagger

## NPM dependencies for removal
<packages used only by business pages>

## Files to PATCH (not delete)
routes/web.php            # remove use/routes of deleted controllers
bootstrap/providers.php   # remove AdminPanelProvider, PaymentServiceProvider, etc.
resources/js/Layouts/AuthenticatedLayout.tsx  # remove menu items
resources/js/Layouts/GuestLayout.tsx
resources/js/Pages/Dashboard.tsx              # reduce to empty stub
database/seeders/DatabaseSeeder.php           # remove business seeder calls

## Application Commands
# 1) remove files/directories from lists above
# 2) composer remove hkulekci/qdrant theodo-group/llphant ...
# 3) npm uninstall <packages>
# 4) ./vendor/bin/sail artisan migrate:fresh
# 5) npm run build && ./vendor/bin/sail artisan test --compact
```

Specific paths and dependencies are generated dynamically on each run.

---

## 6. Termination Checklist

### Auto-mode (during each feature development)
- [ ] New business logic paths are appended to `removed.txt` (no duplicates, dirs with `/`).
- [ ] Core/auth files are NOT in `removed.txt`; nothing deleted.
- [ ] References in core files (routes, providers, menus, seeders) recorded in "Files to PATCH".

### `/clean-development` Command
- [ ] `KEEP` and `REMOVE` sets defined.
- [ ] `removed.txt` gathered with all paths, dependencies, and patch files.
- [ ] Confirmation received before deletion.
- [ ] Business logic files/directories deleted.
- [ ] Core files patched (routes, providers, layouts, dashboard, seeders).
- [ ] Orphaned composer/npm dependencies removed.
- [ ] `migrate:fresh` leaves only system/auth tables.
- [ ] `npm run build` and auth tests pass.
- [ ] Manual check of login/register/logout/profile/empty dashboard passes.
- [ ] Changes documented using `.ai/skills/documentation/SKILL.md`.

---

## Related Skills and Documents

- `.ai/skills/architecture-ddd/SKILL.md` — Layer structure, helps distinguish core from business domain.
- `.ai/skills/documentation/SKILL.md` — Mandatory documentation of results.
- `.ai/skills/source-copy/SKILL.md` — Transferring layouts.
- `AGENTS.md`, `DESIGN_UI.md` — General project conventions.
