---
name: frontend-source-integration
description: Reuse an existing React frontend from frontend/source as the visual source of truth when building or extending the platform Admin Console, storefront, or client cabinet. Use when transferring screens, adapting markup to the target frontend, connecting an existing layout to platform APIs, or adding a module screen without inventing a replacement design.
---

# Frontend Source Integration

Treat `frontends/<application>/source/` as the authoritative source for the visual interface of that application.

## Workflow

1. Locate the requested screen, component, assets and styles in `source/` before changing the target application.
2. Preserve the approved visual hierarchy: sections, component order, nesting, classes, spacing, responsive behaviour and asset intent.
3. Transfer the screen into the application codebase using the chosen React stack. Adapt syntax, routing, data bindings and approved text only.
4. Keep visual components presentational. Put calls to Gateway and module APIs in a typed client, hook or adapter layer.
5. Use the selected project from Admin Console context in every module request. Render only modules enabled for that project.
6. Reuse source assets where their licence permits it. Do not substitute images, icons or a design system without an explicit product decision.
7. Compare the resulting screen with the source at desktop and mobile widths. Record intentional deviations in the module documentation.

## Boundaries

- Do not invent a new interface when a relevant source screen exists.
- Do not copy business logic, secrets or hard-coded API URLs from a source project.
- Do not bypass authorization, project selection or module availability checks in the frontend.
- Do not make direct browser calls to a service database. Use the Gateway or the published module API.
- If the source lacks a requested screen, stop before creating a new visual language and request a design decision.

## Required checks

- Confirm the selected project is visible in the UI and included in API context.
- Confirm a disabled module is absent from navigation and unavailable by direct route.
- Run the repository formatter, type checks and relevant frontend tests.
- Update `docs/` and `SUMMARY.md` when a source screen is adopted or an intentional deviation is approved.
