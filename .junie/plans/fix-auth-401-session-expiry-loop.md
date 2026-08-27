---
sessionId: session-260827-203203-4jak
---

# Requirements

### Overview & Goals
Fix the SPA entering a flicker/retry loop when auth expires (HTTP 401). The app must switch to a stable unauthorized state, show a clear session-expired UI, and guide re-auth without WS reconnect storms.

### Scope
- In Scope:
  - Frontend (apps/chat-web): centralized 401 handling, unauthorized state, blocking UI, Echo/Reverb reconnect gating, optional single silent recovery attempt.
  - Docs: guidance on 401 handling and troubleshooting.
- Out of Scope:
  - Backend auth model changes; API shapes; refresh-token flows; multi-tenant/session storage changes.

### User Stories
- As a user, when my session expires, I want a clear prompt to log in again without the app flickering so I can continue quickly.
- As an admin, I want the client to stop noisy retries and WS reconnect loops on 401 so the system remains stable and observable.

### Functional Requirements
- Centralized 401 handling for protected API calls routes the app to an unauthorized state and cancels further automatic retries.
- Present a blocking, accessible "Session expired" UI until re-auth is completed; normal chat interactions are disabled.
- Provide actions: "Log in again" (cleanup + navigate to login) and optional "Reload".
- Optional single silent recovery attempt per incident (feature-flagged); on success, resume without UI; on failure, show the expired UI; never loop.
- WS (Reverb/Echo) reconnects are paused/disabled while unauthorized; resume only after authorization is restored.
- No backend change is required: relies on consistent 401 with the standard JSON error envelope.

### Non-Functional
- Octane-safe: no global mutable state leaking across requests; client state is in React context only.
- Accessibility: focus trap, keyboard navigation; readable message text.
- Observability: minimal console noise; clear diagnostics.

# Technical Design

### Current Implementation
- Frontend: apps/chat-web (React, TypeScript, Vite), TanStack Query for server state, React Router, Laravel Echo for Reverb; Sanctum cookie-based SPA auth per guidelines.
- Problem: protected HTTP calls return 401 after expiry, triggering retries/renders and Echo reconnect loops → visible flicker and unusable UI.

### Key Decisions
- HTTP 401 interceptor in the shared API client used by TanStack Query; flips an `unauthorized` flag and cancels retries (chosen over scattered per-call handling).
- Lightweight `AuthProvider` (React context) as single source of truth for `authorized/unauthorized`; exposes `enterUnauthorized()`, `attemptSilentRecoveryOnce()`, `logoutAndRedirect()`.
- Blocking session-expired UI (full-screen/modal) controlled by `AuthProvider` to prevent interaction until re-auth.
- Echo/Reverb lifecycle gating: disconnect and prevent reconnects while unauthorized; reinitialize after successful auth.
- Optional single silent recovery attempt (feature-flagged) to avoid loops while enabling seamless recovery when possible.

### Proposed Changes
- apps/chat-web:
  - src/lib/api/client.ts: wrap fetcher/axios used by Query with a 401 interceptor; on first 401 → `enterUnauthorized()` and stop retries; subsequent calls short-circuit.
  - src/features/auth/AuthProvider.tsx: context + reducer for auth state; persistence for one-shot recovery attempt per incident.
  - src/features/auth/SessionExpiredModal.tsx: blocking, accessible UI with actions.
  - src/features/auth/useAuth.ts: hook exposing auth actions.
  - src/lib/realtime/echo.ts: gate connect/reconnect on authorized state; expose `reinit()` after login.
  - App composition: wrap Router with `AuthProvider`.
- No backend changes; ensure consistent 401 envelope documented.

### Data Contracts / Errors
- Reuse existing JSON error envelope for 401; no schema change.

### File Structure
- apps/chat-web/src/lib/api/client.ts
- apps/chat-web/src/features/auth/AuthProvider.tsx
- apps/chat-web/src/features/auth/useAuth.ts
- apps/chat-web/src/features/auth/SessionExpiredModal.tsx
- apps/chat-web/src/lib/realtime/echo.ts
- apps/chat-web/src/app/App.tsx (provider wiring)

### Risks
- Misconfigured silent recovery could mask real logout → default disabled, telemetry, clear UI fallback.
- Blocking UI may disrupt drafts → keep draft text in memory and restore after re-auth.
- Reconnect races → explicit `reinit()` after login and small settle delay.

# Testing

### Validation Approach
- Unit/component tests for interceptor and `AuthProvider` state transitions; accessibility checks for modal.
- Integration test: mid-session 401 → expired UI → login → restored state; verify no flicker and no WS reconnect storm.

### Key Scenarios
- First 401 flips to unauthorized; retries canceled.
- Subsequent protected calls are short-circuited client-side while unauthorized.
- Session-expired UI blocks interaction and is keyboard-accessible.
- "Log in again" cleans up and navigates to login; after re-auth, Echo reinitializes and subscriptions resume.
- Silent recovery: exactly one attempt; success resumes without UI; failure shows UI.
- WS reconnects paused while unauthorized; resume only after auth restored.

### Edge Cases
- 401 while background tab active → no flicker on refocus.
- Rapid consecutive 401s from multiple queries → single unauthorized transition.
- Network flakiness during reinit → retries bounded; no loop.

# Delivery Steps

###   Step 1: implement-centralized-401-handling-and-auth-provider
AuthProvider manages authorized/unauthorized state; API client interceptor flips unauthorized on first 401 and cancels retries.
- Add `AuthProvider` with context/reducer and wire it at the app root
- Implement HTTP client/TanStack Query fetcher interceptor for 401 → `enterUnauthorized()` and stop retries
- Short-circuit subsequent protected calls while unauthorized
- Basic manual check: simulate 401 and verify stable unauthorized state without flicker

###   Step 2: add-session-expired-ui-and-navigation
Blocking session-expired UI is shown and routes user to login or reload.
- Implement `SessionExpiredModal` with focus trap and accessible actions
- Add actions: `Log in again` (cleanup + navigate to login), `Reload` (optional)
- Verify keyboard-only flow works and main UI is blocked until re-auth

###   Step 3: gate-reverb-echo-reconnects-and-reinitialize-after-auth
Echo/Reverb reconnects are paused while unauthorized and reinitialized after successful auth.
- Update `src/lib/realtime/echo.ts` to disconnect on unauthorized and prevent reconnect loops
- Provide `reinit()` to resubscribe after login; verify private channels resume
- Manual test: force 401, observe no reconnect storm; re-auth, observe normal operation

###   Step 4: tests-and-docs
Automated tests cover 401 flows; docs updated with 401 handling guidance.
- Add unit/component tests for interceptor and provider transitions
- Add integration test for 401 → expired UI → login → restore (no flicker)
- Update docs/readme/troubleshooting on session expiry behavior and configuration (silent recovery flag)