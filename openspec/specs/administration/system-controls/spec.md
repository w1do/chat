## Purpose

Defines the minimal administration behavior required to operate the self-hosted chat safely without adding a separate admin product beyond MVP needs.

## Requirements

### Requirement: Administrators can view system status
The system SHALL expose minimal authenticated administration endpoints for operational status, configured feature flags, and background process health.

#### Scenario: Admin views health summary
- **WHEN** an authorized administrator requests the system status
- **THEN** the API returns a summary of application, queue, WebSocket, search, and AI availability

### Requirement: AI can be disabled by administration
The system SHALL allow authorized administrators to disable AI revision features without disabling core chat.

#### Scenario: AI disabled
- **WHEN** AI revisions are disabled by an administrator
- **THEN** AI revision requests return the documented disabled response and ordinary chat messaging still works

### Requirement: Audit records are available to administrators
The system SHALL expose security-sensitive administrative and AI audit records to authorized administrators with privacy-safe filtering.

#### Scenario: Admin lists AI audit records
- **WHEN** an authorized administrator lists AI audit records
- **THEN** the response includes operation metadata and status but not secrets or full private prompt/response content

### Requirement: Horizon access is restricted
The system SHALL restrict queue dashboard or queue status access to authorized administrators only.

#### Scenario: Non-admin requests queue dashboard
- **WHEN** a non-admin authenticated user requests queue operational UI or status requiring administrative access
- **THEN** access is denied with the documented forbidden response

### Requirement: Administration remains API-only for MVP
The MVP system SHALL NOT require Blade, Inertia, or Filament in the user-facing API application to perform required administration workflows.

#### Scenario: Admin capability review
- **WHEN** the MVP administration capability is reviewed
- **THEN** required controls are available through authenticated API contracts and do not require a bundled Filament panel

### Requirement: Administration has minimal API-backed web screens
The chat web application SHALL provide administrator-only screens for system status, AI enablement, and audit review, backed exclusively by the documented administration API and hidden from non-administrators.

#### Scenario: Non-admin cannot see admin screens
- **WHEN** a non-administrator user is authenticated in the SPA
- **THEN** administration screens are not reachable and direct navigation shows the documented forbidden state
