## Purpose
Enable users to request an AI-generated summary of a replied message’s attached file directly in chat, returning a draft (not auto-posted) summary for review and optional publishing.

## ADDED Requirements

### Requirement: Trigger summary via @ai on reply
The system SHALL allow a user to request an AI summary by replying to a message that has a single attached file and including the token `@ai` in the reply draft.

#### Scenario: Summary request accepted
- **WHEN** a user replies to a message with an attached file and includes `@ai`
- **THEN** the system accepts the request and starts processing the summary asynchronously

#### Scenario: No eligible file
- **WHEN** a user replies with `@ai` to a message without a supported file attachment
- **THEN** the system rejects the request with a validation error explaining the missing or unsupported file

### Requirement: Supported file types and limits
The system SHALL accept common document formats (PDF, DOCX, TXT) and SHALL reject unsupported types or files exceeding configured size limits with a clear error.

#### Scenario: Supported PDF
- **WHEN** a user requests summary for a PDF within size limits
- **THEN** the system accepts the request

#### Scenario: Oversized file
- **WHEN** a user requests summary for a file exceeding size limit
- **THEN** the system rejects the request with an error stating the size constraint

### Requirement: Summary length and language
The system SHALL produce a concise summary between 500 and 800 characters in the conversation’s locale unless the locale is unsupported, in which case it SHALL default to English.

#### Scenario: Locale-respecting summary
- **WHEN** the conversation locale is Russian
- **THEN** the summary text is in Russian and its length is between 500 and 800 characters

### Requirement: Draft result with publish confirmation
The system SHALL return the AI result as a draft for the requester, prefixed with a short lead-in (e.g., "Вот что:"), and SHALL NOT publish to the room unless the user explicitly confirms.

#### Scenario: Draft displayed with publish option
- **WHEN** the AI completes
- **THEN** the requester sees the draft summary with "publish to chat?" option

### Requirement: Publish to room
The system SHALL publish the draft summary to the room only after explicit confirmation by the requester and SHALL attribute the message to the requester.

#### Scenario: Publish confirmed
- **WHEN** the requester confirms publish
- **THEN** the summary appears in the room as a normal message authored by the requester

### Requirement: Progress and completion feedback
The system SHALL provide progress/completion state to the requester via real-time updates and SHALL expose final status via HTTP for resync after reconnect.

#### Scenario: Real-time completion
- **WHEN** processing completes
- **THEN** the requester receives a real-time event indicating completion with a reference to the draft

#### Scenario: HTTP resync
- **WHEN** the requester refreshes after reconnect
- **THEN** the requester can retrieve the final status and the draft via HTTP without relying solely on real-time events

### Requirement: Permissions and access control
The system SHALL allow summary only if the requester has read access to the original message and its file, and is a member of the room.

#### Scenario: Not a room member
- **WHEN** a non-member attempts to request a summary
- **THEN** the system responds with 403 Forbidden

### Requirement: Rate limit and quotas
The system SHALL enforce per-user and per-project rate limits and quotas for AI summary requests and respond with 429 when exceeded.

#### Scenario: Quota exceeded
- **WHEN** the requester exceeds their quota
- **THEN** the system returns 429 with an error code indicating quota limit reached

### Requirement: Privacy and data handling
The system SHALL send only the necessary file content to the AI provider and SHALL NOT store provider responses or file contents in logs; audit records SHALL exclude sensitive content.

#### Scenario: No sensitive content in logs
- **WHEN** a summary is performed
- **THEN** application logs and audit entries do not contain the full file text or summary

### Requirement: Reliability and timeouts
The system SHALL process summary asynchronously with a reasonable timeout; on timeout or provider failure it SHALL return a failure state with an error code and allow retry.

#### Scenario: Provider timeout
- **WHEN** the provider does not respond within the configured timeout
- **THEN** the system marks the request as failed with a timeout error and allows the user to try again later

### Requirement: Idempotency
The system SHALL treat duplicate requests with the same idempotency key for the same replied message as a single operation and return the existing result state when applicable.

#### Scenario: Duplicate request
- **WHEN** two identical requests with the same idempotency key are submitted
- **THEN** the system returns the same operation reference and does not start a second job

### Requirement: Auditability
The system SHALL create an audit log entry for each AI summary action including requester, room, file metadata (non-sensitive), provider, model, tokens/approximate cost, status, and timestamps.

#### Scenario: Audit entry recorded
- **WHEN** a summary completes successfully
- **THEN** an audit entry exists with the required metadata and without sensitive text
