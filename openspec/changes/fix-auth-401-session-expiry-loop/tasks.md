## 1. Frontend session state and 401 interception

- [x] 1.1 Introduce AuthProvider with authorized/unauthorized state; verify provider renders children normally when authorized and blocks when unauthorized via story or test route
- [x] 1.2 Wrap API client (TanStack Query fetcher) with 401 interceptor; verify a mocked 401 flips provider to unauthorized and cancels query retries
- [x] 1.3 Implement single-attempt silent recovery hook (feature-flagged); verify success path restores authorized state without showing the expired UI and failure path shows it

## 2. Session expired UI and navigation

- [x] 2.1 Add session-expired full-screen/modal UI; verify it blocks interaction and is keyboard-accessible (focus trap, ESC behavior as specified)
- [x] 2.2 Implement "Log in again" action; verify it performs cleanup and navigates to login route
- [x] 2.3 Implement optional "Reload" action; verify page reloads and app re-initializes cleanly

## 3. Real-time lifecycle gating

- [x] 3.1 Gate Echo/Reverb reconnects on unauthorized; verify no reconnect loop occurs during unauthorized state
- [x] 3.2 Reinitialize Echo after successful auth; verify private channel subscriptions resume

## 4. Tests and docs

- [x] 4.1 Add component/unit tests for interceptor and provider transitions; verify 401 scenarios covered
- [x] 4.2 Add integration test covering 401 mid-session -> expired UI -> login -> restore flow; verify no flicker and stable state
- [x] 4.3 Update docs: frontend 401 handling guidance and troubleshooting; verify docs build passes

## 5. Rollout and verification

- [x] 5.1 Add feature toggle for silent recovery; verify disabled by default in production config
- [ ] 5.2 Manual QA matrix: background tab, WS reconnect, typing -> 401 -> recover; verify acceptance criteria from specs
