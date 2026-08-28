## Context
- Frontend: apps/chat-web uses React, TanStack Query for server state, React Router, Laravel Echo for Reverb (WS), and Sanctum cookie-based SPA auth per guidelines.
- Current issue: On session expiry, protected HTTP calls return 401 causing repeated retries/renders and WS reconnect loops, leading to UI flicker and unusable app.
- Backend: apps/chat-api correctly returns 401 on expired sessions; no API changes are required.

## Goals / Non-Goals

**Goals:**
- Centralize client-side 401 handling and transition to a stable unauthorized state.
- Present a session-expired UI and block normal interactions until re-auth.
- Gate WS reconnects while unauthorized; re-enable after successful auth.
- Allow exactly one optional silent recovery attempt when configured; otherwise avoid loops.

**Non-Goals:**
- Changing backend auth model or endpoints.
- Introducing new global state managers beyond a small, scoped auth/session provider.
- Building a full refresh-token flow where none exists.

## Decisions

1) Centralize 401 handling via fetch/HTTP interceptor used by TanStack Query
- Choice: Wrap the app's API client/fetcher with a 401 interceptor that flips an `unauthorized` flag in an `AuthProvider` and cancels further retries.
- Alternatives: Handle per-call try/catch (scattered and error-prone); global window fetch monkey-patch (harder to reason and test).

2) Introduce lightweight `AuthProvider` (React context) to own `authorized`/`unauthorized` state
- Choice: Single source of truth for session state; exposes `enterUnauthorized()`, `attemptSilentRecoveryOnce()`, `logoutAndRedirect()`.
- Alternatives: Co-locate state in pages (duplicated), or overuse Zustand for global state (unnecessary here).

3) Session-expired UI as blocking route/modal
- Choice: Full-screen route or top-level modal rendered by the `AuthProvider` when unauthorized; disables underlying interactions.
- Alternatives: Toast-only (insufficient), soft banner (does not stop actions that will fail).

4) WS (Reverb/Echo) lifecycle gating
- Choice: On unauthorized, disconnect Echo and prevent reconnects; on re-auth, reinitialize with fresh credentials.
- Alternatives: Let Echo auto-reconnect (causes loops and noise), or keep it connected (security risk).

5) Optional single silent recovery attempt
- Choice: If configured (e.g., CSRF refresh + re-check), try once per incident; on failure, show session-expired UI.
- Alternatives: Multiple retries with backoff (risks loops/flicker), never try (worse UX when recoverable).

## Risks / Trade-offs
- Risk: Silent recovery path may mask true logout if misconfigured → Mitigation: feature-flag and telemetry; default to disabled.
- Risk: Blocking UI may frustrate users mid-action → Mitigation: keep draft text in memory and restore after re-auth.
- Risk: Echo reconnect suppression might miss reconnection on rare races → Mitigation: reinitialize Echo explicitly after successful auth and add small delay.

## Migration Plan
- Ship behind a small feature flag/env toggle for silent recovery; session-expired UI is always on.
- Validate with manual test matrix (API 401 mid-typing, background tab, reconnects).
- Rollback by disabling the new interceptor/provider and restoring prior fetcher.
