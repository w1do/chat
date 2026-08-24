## Purpose

Defines the public HTTP, generated client, error, and real-time contract rules that downstream frontend packages and self-hosted operators can rely on.

## ADDED Requirements

### Requirement: HTTP API uses versioned JSON contracts
The system SHALL expose public application endpoints under `/api/v1` and SHALL return JSON for successful and error responses.

#### Scenario: Unknown API route
- **WHEN** a client requests an unknown `/api/v1` route
- **THEN** the API returns the documented JSON error envelope instead of an HTML error page

### Requirement: Errors use a consistent envelope
The system SHALL use a consistent JSON error envelope containing `code`, `message`, `details`, and `trace_id` for documented error classes.

#### Scenario: Validation error
- **WHEN** a request fails validation
- **THEN** the response contains the documented status code and error envelope with field-level details

### Requirement: OpenAPI is the frontend source of truth
The system SHALL maintain OpenAPI 3.1 documentation for public HTTP endpoints and generate the frontend API client from the assembled contract.

#### Scenario: Contract generation
- **WHEN** API contracts are generated
- **THEN** the generated frontend client matches the committed OpenAPI document with no manual edits required

### Requirement: Real-time events have schemas
The system SHALL publish JSON Schemas for versioned real-time event payloads used by the chat client.

#### Scenario: Event payload validation
- **WHEN** a `message.updated.v1` payload is produced in tests
- **THEN** it validates against the committed schema for that event version

### Requirement: Breaking contract changes are controlled
The system SHALL treat incompatible HTTP or event payload changes as breaking changes requiring versioning, migration notes, and contract tests.

#### Scenario: Additive field change
- **WHEN** a new optional response field is added
- **THEN** existing clients remain compatible and the OpenAPI or event schema is updated in the same change

