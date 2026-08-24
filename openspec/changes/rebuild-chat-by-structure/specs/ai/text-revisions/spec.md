## Purpose

Defines AI-assisted text revision behavior for drafts and selected user messages using a provider contract, safe privacy defaults, quotas, and auditability.

## ADDED Requirements

### Requirement: Users can request text revisions
The system SHALL let authenticated users request supported AI operations for a draft or explicitly selected message they are allowed to access.

#### Scenario: Improve draft
- **WHEN** an authenticated user requests an improvement operation for a valid draft
- **THEN** the API returns a proposed revised text without automatically publishing or overwriting the original draft

### Requirement: AI operations are limited and cancellable
The system SHALL enforce configured text length, rate limits, quotas, timeout, and cancellation behavior for AI revision requests.

#### Scenario: Input exceeds length limit
- **WHEN** a user submits text longer than the configured AI limit
- **THEN** the API rejects the request with the documented validation error and no provider call is made

### Requirement: Provider failures do not break chat
The system SHALL allow normal chat message sending and editing to continue when the AI provider fails or is disabled.

#### Scenario: Provider timeout
- **WHEN** the AI provider times out during a revision request
- **THEN** the API returns the documented external-provider error and the original message or draft remains usable

### Requirement: AI privacy defaults are enforced
The system SHALL send only the minimum required text and metadata to the AI provider for the requested operation.

#### Scenario: Single draft revision
- **WHEN** a user requests a revision for a single draft
- **THEN** the system does not send unrelated room history to the provider

### Requirement: AI use is audited safely
The system SHALL record AI operation, user, provider, model, status, token or cost metadata when available, and safe diagnostic metadata without storing secrets or full private prompt/response text by default.

#### Scenario: Successful AI revision audit
- **WHEN** an AI revision succeeds
- **THEN** an audit record exists with operation status and safe metadata but without provider credentials or unrestricted room history


### Requirement: AI revisions have an integrated composer UI
The chat web application SHALL offer AI revision actions on the message draft that present results as suggestions the user explicitly accepts or discards, SHALL indicate that text was processed by external AI, and SHALL hide or disable AI actions when AI is disabled.

#### Scenario: User accepts an AI suggestion
- **WHEN** a user requests a revision and the provider succeeds
- **THEN** the suggested text is shown alongside the draft and replaces it only after explicit acceptance

#### Scenario: AI disabled in UI
- **WHEN** AI is disabled by administration
- **THEN** the composer does not offer AI actions and normal message sending continues to work
