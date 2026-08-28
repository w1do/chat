## Why

When the user's session expires, the chat frontend enters a rapid render/retry loop with repeated 401 responses, making the UI flicker and unusable. We must handle auth expiry deterministically to keep the app stable and guide the user to re-authenticate.

## What Changes

- Add deterministic session-expiry handling in the SPA for any 401 from protected API calls.
- Pause noisy retries/re-renders and present a non-dismissible "Session expired" screen/modal with clear next steps.
- Cleanly stop WS (Reverb) reconnect loops on unauthorized state.
- Centralize 401 handling in the API client, attempting one safe silent recovery (if configured) and otherwise route to re-auth.
- Ensure idempotent logout/cleanup and safe redirect to the login route.

## Capabilities

### New Capabilities
- identity/session-expiry-handling: Define client-visible behavior for expired session: 401 handling, UI state, redirect to login, and real-time disconnect policy.

### Modified Capabilities
- 

## Impact

- Frontend (apps/chat-web): API client interceptors, global auth/session provider, UI modal/screen, Echo/Reverb lifecycle.
- Backend (apps/chat-api): No behavior change required; relies on consistent 401 for expired sessions. Document expectations for 401 semantics under Sanctum.
- Docs/OpenAPI: Note 401 handling pattern in frontend integration guidance; no API shape changes.
