---
sessionId: session-260827-151929-kyar
---

# Requirements

### Overview & Goals
- Stabilize the message list while typing so the list does not jump downward on each keystroke until it "settles".
- Make notification channel preferences reliably load with a clear retry path when the request fails.
- Prevent pinch/double-tap zoom across the chat UI on mobile devices.

### Scope
- In Scope:
  - Mobile chat screen scroll/auto-grow interaction while composing: `packages/frontend/chat/src/components/mobile/ChatScreen.tsx`.
  - Notification preferences loading UI/UX and retry: `packages/frontend/notifications/src/components/PreferencesForm.tsx`, `packages/frontend/notifications/src/hooks/useNotifications.ts`, integration in `apps/chat-web/src/pages/SettingsScreen.tsx`.
  - Pinch/double-tap zoom prevention: `apps/chat-web/src/styles/index.css`, `apps/chat-web/src/main.tsx`, and `apps/chat-web/index.html` if needed.
- Out of Scope:
  - Backend changes to notification APIs.
  - Desktop UI overhaul or unrelated chat features.

### User Stories
- As a user composing a message on mobile, I want the history list to remain visually stable so I can keep context while typing.
- As a user opening Settings → Notification Channels, I want a clear retry when loading fails so I can attempt again without re-opening the sheet.
- As a mobile user, I don’t want the UI to zoom when I pinch or double-tap anywhere in the app.

### Functional Requirements
- Chat typing should not cause the list to jump unless the user is already at the bottom, in which case it may auto-stick to bottom smoothly without animation.
- When notification preferences fail to load, the user sees a concise error and a working retry that re-queries preferences.
- Pinch and double-tap zoom are effectively blocked on iOS Safari and Android Chrome.

### Non-Functional Requirements
- No noticeable input latency while typing (avoid heavy reflows; batch with rAF where possible).
- Mobile-first behavior; no regressions for desktop layout.
- Accessibility: maintain readable focus order and ARIA states for loading/error.

# Technical Design

### Current Implementation
- Chat scroll handling: `ChatScreen.tsx` maintains a scroller ref and, on draft resize, snaps to bottom when the user is near the bottom using a gap threshold (currently a very small threshold to reduce jumpiness).
- Notifications UI: `PreferencesForm.tsx` supports loading, error, and has `onRetry`; `SettingsScreen.tsx` wires `onRetry` to `preferences.refetch()`; data via TanStack Query hooks in `useNotifications.ts`.
- Pinch-zoom prevention: global CSS `touch-action` in `apps/chat-web/src/styles/index.css` and global listeners in `apps/chat-web/src/main.tsx` prevent iOS gesture events and double-tap zoom.

### Key Decisions
- Preserve user-driven scroll position unless user is truly at the bottom; compute precise delta adjustments when the composer height changes instead of unconditional snap.
- Use `ResizeObserver` on the input/composer container to compute height delta and apply a bottom-anchored correction only when not at bottom.
- Batch scroll corrections in `requestAnimationFrame`/`useLayoutEffect` to avoid layout thrash while typing.
- Harden notifications loading with explicit retry/backoff via TanStack Query options while keeping the existing manual Retry button.
- Add a viewport meta fallback to disallow zoom as defense-in-depth on mobile browsers.

### Proposed Changes
- Chat scroll stabilization in `packages/frontend/chat/src/components/mobile/ChatScreen.tsx`:
  - Track three states: `atBottom` (gap <= small threshold), `userScrolling` (set on wheel/touchmove), and last `composerHeight`.
  - Add `ResizeObserver` to the composer wrapper: on height change `dh`, if `atBottom` → `scrollTo(el.scrollHeight)` (behavior `auto`), else adjust `el.scrollTop += dh` to preserve visual anchoring; batch via rAF/useLayoutEffect.
  - Keep the tiny stickiness threshold, but move away from always computing from `scrollHeight` after each keystroke; rely on delta math to avoid jump.
  - Guard against load-more prepend: when older messages are prepended, preserve anchor with saved `firstVisibleId` or `prevScrollHeight` delta.

- Notifications preferences UX:
  - `useNotificationPreferences()` — set `retry: 2`, `retryDelay: (c) => 500 * 2**c`, `staleTime: short window` to smooth transient failures; keep `refetch` for manual retry.
  - `PreferencesForm.tsx` — keep existing loading/error/Retry states; add optional hint for 401/403 if hook exposes it (map error types minimally without coupling to backend).

- Pinch/double-tap zoom hardening:
  - Confirm and, if missing, set `index.html` viewport: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no`.
  - Keep CSS `touch-action` rules and JS gesture/double-tap prevention in `main.tsx`; ensure listeners are `{ passive: false }` (already set).

### Data Models / Contracts
- No API contract changes. Only client behavior and UI states.

### Components
- `ChatScreen.tsx`: add `ResizeObserver`, bottom-anchored delta scroll correction, rAF batching, and user-scrolling guard.
- `PreferencesForm.tsx`: keep error UI with Retry; optionally improve error text if error shape is detectable without tight coupling.
- `useNotifications.ts`: tune `useQuery` options for preferences.
- `index.html`/`index.css`/`main.tsx`: reinforce zoom prevention.

### File Structure
- Modify:
  - `packages/frontend/chat/src/components/mobile/ChatScreen.tsx`
  - `packages/frontend/notifications/src/hooks/useNotifications.ts`
  - `packages/frontend/notifications/src/components/PreferencesForm.tsx`
  - `apps/chat-web/index.html`
  - `apps/chat-web/src/styles/index.css`
  - `apps/chat-web/src/main.tsx`

### Risks
- Over-correction could cause subtle scroll drift; mitigate with tight delta calculation and tests.
- Aggressive zoom blocking can hinder accessibility for users relying on page zoom; scope to mobile app shell and keep text size controls in-app.

# Testing

### Validation Approach
- Component tests and mobile-emulated E2E to verify scroll stability, notifications retry, and disabled zoom.

### Key Scenarios
- Chat scroll
  - Typing expands textarea: if not at bottom, list does not jump; if at bottom, stays pinned without animation.
  - Attaching images that grow composer height preserves viewport anchor.
  - Loading older messages (pagination up) preserves current viewport.
- Notifications
  - API failure shows error and Retry; clicking Retry refetches and renders rows on success.
  - Toggling a locked preference shows inline error and does not flip state.
- Zoom
  - Pinch and double-tap gestures do not change effective scale on iOS/Android emulation.

### Edge Cases
- Very long drafts causing multiple line wraps.
- Rapid toggle of preferences with transient network errors.
- Browser with reduced motion preference: no animated scroll is used for corrections.

# Delivery Steps

### ✓ Step 1: Stabilize mobile chat scroll during composer auto-resize
Message list does not jump while typing; stays pinned only when already at bottom.

- In `ChatScreen.tsx`, add `ResizeObserver` on the composer container and compute height delta on change.
- If not at bottom, adjust `scrollTop += delta` to preserve anchor; if at bottom, snap to bottom with `behavior: 'auto'`.
- Track `atBottom` and `userScrolling` flags; ignore corrections while user is actively scrolling.
- Batch updates with `requestAnimationFrame` or `useLayoutEffect` to avoid reflow thrash.
- Verify no regressions on load-more (prepend) — keep previous `scrollHeight` and correct accordingly.

### ✓ Step 2: Harden notification preferences loading with retry
Preferences screen shows a clear error with a working retry and tolerates transient failures.

- In `useNotificationPreferences()`, add conservative `retry`/`retryDelay` and a short `staleTime`.
- Keep `onRetry={() => void preferences.refetch()}` in `SettingsScreen.tsx`; ensure `PreferencesForm` exposes consistent loading/error/empty states.
- Optionally surface recognizable auth/forbidden hints without coupling to backend internals.
- Add component test to simulate failure → Retry → success.

### ✓ Step 3: Reinforce pinch and double‑tap zoom prevention
Mobile gestures no longer zoom the UI across supported browsers.

- Ensure `index.html` has viewport `maximum-scale=1, user-scalable=no`.
- Keep CSS `touch-action` on `html, body, #root` and media elements; review for conflicts.
- Keep JS gesture listeners in `main.tsx` with `{ passive: false }`; confirm double‑tap prevention timing.
- Add E2E check under mobile emulation that pinch/double‑tap do not change scale.