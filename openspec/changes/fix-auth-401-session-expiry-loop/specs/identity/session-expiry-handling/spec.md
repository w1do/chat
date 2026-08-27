## Purpose
Ensure the SPA behaves deterministically when the auth session expires: avoid UI flicker/retry loops, inform the user, and guide them to re-authenticate while safely stopping unauthorized real-time reconnects.

## ADDED Requirements

### Requirement: Centralized 401 handling for protected API calls
The SPA MUST centralize handling of HTTP 401 responses from protected endpoints and transition to a controlled "unauthorized" state.

#### Scenario: First 401 received during user interaction
- **WHEN** a protected API request returns 401 Unauthorized
- **THEN** the app transitions to an unauthorized state and stops further automatic retries for that request

#### Scenario: Subsequent API calls after unauthorized state
- **WHEN** any further protected API call is attempted while unauthorized
- **THEN** the request is prevented or short-circuited client-side without triggering additional network retries

### Requirement: Session expired UI
The SPA MUST present a non-dismissible session-expired screen/modal that blocks interaction with the main chat UI.

#### Scenario: Session expired modal shown
- **WHEN** the app enters the unauthorized state
- **THEN** a "Session expired" UI is shown with clear actions to log in again or reload, and normal chat interactions are disabled

### Requirement: Safe redirect to login
The SPA MUST guide the user to re-authenticate via the configured login route without losing global error state.

#### Scenario: User chooses to log in again
- **WHEN** the user selects "Log in again" in the session-expired UI
- **THEN** the app performs cleanup (auth tokens/cookies/client state as applicable) and navigates to the login route

### Requirement: Optional silent recovery attempt (single try)
If a product-approved silent recovery is configured, the SPA MAY attempt it exactly once per unauthorized incident; otherwise it MUST not loop retries.

#### Scenario: Silent recovery succeeds
- **WHEN** a single silent recovery attempt completes successfully
- **THEN** the app returns to an authorized state and resumes normal operation without showing the session-expired UI

#### Scenario: Silent recovery fails
- **WHEN** the silent recovery attempt fails or is not configured
- **THEN** the app remains in the unauthorized state and shows the session-expired UI; no further automatic retries are attempted

### Requirement: Real-time reconnect gating
The SPA MUST prevent endless WS reconnect loops while unauthorized and MUST re-authorize real-time only after the user is authorized again.

#### Scenario: WS unauthorized while session expired
- **WHEN** the app is unauthorized
- **THEN** WS reconnect attempts are paused or fail fast without UI flicker until authorization is restored

### Requirement: Error envelope preservation
The SPA MUST handle 401 responses using the project's standard JSON error envelope without assuming backend changes.

#### Scenario: Standard error envelope on 401
- **WHEN** a 401 response is received
- **THEN** the client reads the standard error envelope (code/message) for diagnostics, but UI behavior follows the session-expiry rules above
