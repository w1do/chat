## Purpose

Defines fast, permission-safe message search for room history using a search index while preserving PostgreSQL as the durable source of truth.

## ADDED Requirements

### Requirement: Messages are indexed for search
The system SHALL index searchable message content and safe metadata after messages are created, edited, or soft-deleted.

#### Scenario: Message indexed after commit
- **WHEN** a message is successfully committed
- **THEN** it becomes searchable after indexing without exposing uncommitted or rolled-back data

### Requirement: Search results are permission scoped
The system SHALL only return search results from rooms and messages the requesting user is allowed to access.

#### Scenario: Non-member searches private room content
- **WHEN** a non-member searches for text that exists only in a private room
- **THEN** the search response does not reveal the private message or room

### Requirement: Soft-deleted messages are not searchable as normal content
The system SHALL remove or mark soft-deleted message content so ordinary search does not expose deleted text.

#### Scenario: Search after message deletion
- **WHEN** an authorized user soft-deletes a message
- **THEN** ordinary search no longer returns the deleted message body

### Requirement: Reindexing is supported
The system SHALL provide a documented reindex process that rebuilds the search index from durable storage.

#### Scenario: Rebuild empty index
- **WHEN** an operator runs the documented reindex command after creating a fresh search index
- **THEN** searchable messages from rooms are indexed with permission-safe metadata

### Requirement: Search degradation is explicit
The system SHALL return a documented degraded response or fallback behavior when the search service is unavailable.

#### Scenario: Search service unavailable
- **WHEN** the search index cannot be reached
- **THEN** the API returns a documented service-unavailable or fallback response without leaking stack traces


### Requirement: Search has an integrated web UI
The chat web application SHALL provide room-scoped message search with result, empty, and service-degraded states in the same stage as the search API.

#### Scenario: Search service degraded in UI
- **WHEN** the search backend is unavailable
- **THEN** the UI shows the documented degraded state instead of a broken screen or leaked error details
