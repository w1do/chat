## Purpose

Defines user identity, session, profile, and baseline authorization behavior for the chat product while keeping the API suitable for a React SPA.

## ADDED Requirements

### Requirement: Users can manage sessions
The system SHALL allow users to register, log in, log out, and recover passwords through JSON API flows.

#### Scenario: Successful login
- **WHEN** a registered user submits valid credentials from the SPA
- **THEN** the API creates an authenticated session and returns the current user through the documented JSON contract

#### Scenario: Invalid login
- **WHEN** a user submits invalid credentials
- **THEN** the API returns the documented JSON error envelope without revealing whether the email exists

### Requirement: SPA authentication is cookie based
The system SHALL authenticate the SPA with secure cookie-based Sanctum behavior and CSRF protection.

#### Scenario: Cross-origin request from disallowed origin
- **WHEN** an authentication request comes from an origin outside the configured allowlist
- **THEN** the API rejects the request according to the CORS and authentication contract

### Requirement: Users can view and update profile
The system SHALL allow authenticated users to view and update basic profile fields without exposing private security fields.

#### Scenario: Profile update
- **WHEN** an authenticated user submits valid profile changes
- **THEN** the API persists allowed fields and returns the updated profile resource

### Requirement: Authorization is server enforced
The system SHALL enforce user authorization on the server for protected identity and administration actions.

#### Scenario: Unauthenticated profile access
- **WHEN** a guest requests the current profile endpoint
- **THEN** the API returns the documented unauthenticated JSON error response

### Requirement: Identity status is Octane safe
The system SHALL prevent identity, locale, permission, or request data from leaking between sequential requests served by a long-running worker.

#### Scenario: Sequential users on one worker
- **WHEN** two different users make sequential authenticated requests through the same long-running worker
- **THEN** each response contains only the identity and permissions for the current request user


### Requirement: Identity has an integrated web UI
The chat web application SHALL provide login, registration, password recovery, and profile screens built from the identity frontend package in the same stage as the identity API, with loading, error, and keyboard-accessible states.

#### Scenario: User logs in through the SPA
- **WHEN** a user submits valid credentials through the login screen
- **THEN** the SPA authenticates via the documented cookie flow and navigates to the chat interface showing the current user
