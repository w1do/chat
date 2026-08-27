## Purpose
Enable members to request an AI‑generated summary of a single chat attachment (document/PDF) and optionally publish that summary to the room.

## ADDED Requirements

### Requirement: Summarize a single eligible attachment
The system SHALL accept a request to summarize one existing attachment from a message the requester can view. Eligible types include PDFs and common office/text documents by MIME type; images/audio/video are NOT eligible.

#### Scenario: Eligible PDF
- **WHEN** a member requests AI analysis for a PDF attachment they can access
- **THEN** the system starts AI processing and returns a tracking response

#### Scenario: Ineligible image
- **WHEN** a member requests AI analysis for an image attachment
- **THEN** the system responds with 400 and a problem explaining the attachment type is unsupported

### Requirement: Use Polza AI provider
The system MUST use the configured Polza provider to produce a concise summary and MUST enforce provider timeouts, quotas, and rate limits.

#### Scenario: Provider timeout
- **WHEN** the provider does not respond within the configured timeout
- **THEN** the system responds with 504-equivalent error envelope and does NOT consume additional quota

#### Scenario: Quota exceeded
- **WHEN** the requester exceeds quota or rate limits
- **THEN** the system responds with 429 and an error envelope

### Requirement: Summary length and content policy
The summary SHALL be a concise extractive+abstractive summary between 500 and 800 Unicode characters, neutral tone, no PII leakage beyond the source document.

#### Scenario: Length window
- **WHEN** the provider returns a longer text
- **THEN** the system trims to the upper bound without breaking words

### Requirement: UI progress and modal confirmation
The client SHALL display a visible progress indicator while the request is running and THEN show a modal with the summary and two actions: “Отправить” and “Не отправлять”.

#### Scenario: User cancels in modal
- **WHEN** the user chooses “Не отправлять”
- **THEN** the modal closes and no message is created

### Requirement: Publish summary as a normal message (optional)
On user confirmation, the client SHALL publish the summary as a regular text message in the same room, attributed to the requesting user, with standard mentions disabled by default.

#### Scenario: Publish summary
- **WHEN** the user clicks “Отправить”
- **THEN** a new text message appears in the room containing the summary

### Requirement: Security and privacy
The system MUST only send the attachment content necessary for summarization to Polza; MUST NOT include unrelated room history; MUST store minimal audit metadata.

#### Scenario: Access control enforced
- **WHEN** a non-member or a member without access requests analysis
- **THEN** the system responds with 403 and no provider call is made

### Requirement: Error envelopes
All errors MUST use the standard JSON error envelope with appropriate HTTP codes (400/401/403/404/409/422/429/500). Provider failures are mapped to 502/503/504 as applicable.

#### Scenario: Provider error mapped
- **WHEN** Polza returns a transport or server error
- **THEN** the system responds with a mapped 5xx and error envelope
