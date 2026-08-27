---
sessionId: session-260827-183738-39uu
---

# Requirements

### Overview & Goals
Replying with `@ai` to a message that has an attached document triggers AI analysis via Polza and returns a 500–800 character draft summary for the requester with an option to publish it to the room.

### Scope
- In Scope:
  - `@ai` trigger on reply to a message with a single attached file (PDF/DOCX/TXT).
  - Polza-based file analysis, length clamp (500–800 chars), locale-aware output.
  - Draft result shown to requester; explicit confirmation to publish as a normal message.
  - Permissions (room membership, file access), validation, rate limits/quotas.
  - Async processing with progress/completion updates and HTTP resync.
  - Idempotency, audit logging, failure/timeout handling.
- Out of Scope:
  - Multi-file or image/OCR summarization; auto-publish; provider marketplace.

### User Stories
- As a room member, I can reply with `@ai` to a file message to get a concise summary without leaving chat.
- As a requester, I see the draft summary and can choose to publish it to the room.
- As an admin, I can audit AI actions without exposing private content.

### Functional Requirements
- Trigger: reply with `@ai` to a message that has a supported attached file; reject if missing/unsupported/exceeds size.
- Summary: 500–800 chars, locale-aware (fallback to English), prefixed with a short lead-in (e.g., "Вот что:").
- Draft: shown only to requester until publish; publish posts as requester’s message.
- Real-time: progress/completion to requester; HTTP endpoints allow resync after reconnect.
- Security: enforce room membership and file access; rate limit and quotas; idempotency key.
- Reliability: async job with timeout/retry/backoff; failures surfaced with clear error codes; audit entries recorded.

### Non-Functional Requirements
- Privacy: send minimum data to provider; do not log file text or summary; tenant isolation.
- Performance: strict file size cap; job timeout < queue retry_after; clamp and return within budget.
- Compatibility: Laravel 13, Reverb for WS, Redis queues; OpenAPI-first HTTP API.

# Technical Design

### Current Implementation
- Monorepo with Laravel apps and backend packages under `packages/backend/*`; CQRS-lite, DTOs via spatie/laravel-data, Reverb for real-time, Horizon for queues, Sanctum SPA auth.

### Key Decisions
- Boundary: Initiation and orchestration in `packages/backend/ai`; publish flow remains in `packages/backend/chat`.
- Provider: Introduce `FileSummaryProvider` contract with a Polza adapter in `packages/backend/ai/src/Infrastructure/Providers/Polza/`.
- API: `POST /api/v1/ai/file-summaries` to initiate; `POST /api/v1/ai/file-summaries/{id}/publish` to confirm publishing; HTTP resync endpoint to fetch status/draft.
- Async & Idempotency: enqueue `SummarizeFileJob`; unique key `(project_id, requester_id, replied_message_id, idempotency_key)`; return `202` + operation id.
- Events: Reverb event `ai.file_summary.updated.v1 {id,status,progress}` to requester; published message uses existing chat events.
- Security/Privacy: room membership + file access checks; MIME whitelist and size caps; scrub logs; audit without sensitive content.

### Proposed Changes
- AI Package (`packages/backend/ai`):
  - Application: `SummarizeFileCommand`, handler; DTOs for request/response; idempotency and quotas.
  - Infrastructure: `FileSummaryProvider` + `PolzaFileSummaryClient` with timeouts/retries; job `SummarizeFileJob` with backoff and `failed()` audit.
  - Presentation: Http/Api/V1 controller for initiate/status/publish endpoints (DTO in/out only).
- Chat Package (`packages/backend/chat`):
  - Publish endpoint to post draft as requester’s message; re-use policies and events.
- Notifications/Real-time:
  - Broadcast progress/completion to requester; ensure HTTP resync endpoint reflects latest state after reconnect.

### Data Models / Contracts
- Table `ai_requests`: `id (ULID)`, `project_id`, `user_id`, `room_id`, `replied_message_id`, `provider`, `model`, `status`, `summary_draft`, `tokens/cost (ints)`, timestamps, error code.
- DTOs (spatie Data): `CreateFileSummaryRequestData`, `FileSummaryStatusData`, `PublishSummaryRequestData`.

### File Structure
- packages/backend/ai/src/
  - Application/{Commands,DTOs,Handlers}/SummarizeFile*
  - Infrastructure/Providers/Polza/*
  - Presentation/Http/Api/V1/{Controllers,Requests,Resources}
- packages/backend/chat/src/Presentation/Http/Api/V1/Controllers/PublishSummaryController.php

### Risks
- Provider length variance → clamp to 500–800 chars (preserve sentence boundaries).
- Large/unsupported files → early validation; configurables for caps.
- Duplicate requests → idempotency + unique locks.
- Privacy leakage → structured errors; no content in logs/audit.

# Testing

### Validation Approach
- Feature tests for endpoints (happy, invalid, forbidden, rate-limited, timeout/failure).
- Contract tests for OpenAPI responses and Reverb event payload.
- Unit tests for handler logic, provider adapter, and length clamping.

### Key Scenarios
- Reply `@ai` with supported file → 202 and operation id, later draft ready.
- Unsupported/oversized file → 422 with code.
- Non-member or no file access → 403.
- Quota exceeded → 429.
- Provider timeout → failure with retry allowed.
- Duplicate requests with same idempotency key → same operation id.
- Publish confirmation → message appears in room, normal events fired.

### Edge Cases
- Locale unavailable → fallback to English.
- Reconnect → HTTP resync returns final status and draft.
- Audit log contains only metadata, no sensitive text.

# Delivery Steps

###   Step 1: wire-contracts-and-endpoints
Initiation/status/publish endpoints and DTOs exist and validate via OpenAPI.
- Define request/response Data classes in AI Presentation and Chat publish controller contract
- Add routes under `/api/v1/ai/file-summaries*` and publish path; return 202 + operation id on initiate
- Implement Form Requests (validation: membership, replied message id, file presence/type/size, idempotency key)
- Add Policies for room/file access and verify 403 on forbidden
- Update OpenAPI and ensure validation/tests pass

###   Step 2: ai-use-case-and-provider-adapter
SummarizeFileCommand/handler, job, and Polza adapter process files asynchronously.
- Implement `SummarizeFileCommand` + handler in AI Application, persisting `ai_requests`
- Create `FileSummaryProvider` and `PolzaFileSummaryClient` with timeouts/retries and error mapping
- Implement `SummarizeFileJob` with backoff, unique lock, and `failed()` audit
- Enforce idempotency (unique key) and quotas/rate limits
- Clamp summary to 500–800 chars preserving sentences; add unit tests

###   Step 3: real-time-and-resync
Requester receives progress/completion events and can resync via HTTP.
- Emit `ai.file_summary.updated.v1` to requester with status/progress/draft ref
- Implement HTTP status endpoint for resync after reconnect
- Add contract tests for event payload and resync response

###   Step 4: draft-storage-and-publish-flow
Draft is private to requester until explicit publish posts it to the room.
- Persist draft summary associated with operation and requester; hide from others
- Implement publish controller in Chat to post as requester’s message; reuse existing message events
- Add feature tests for visibility, publish confirmation, and normal chat events

###   Step 5: security-privacy-observability-docs
Hardened behavior, metrics, and user-facing documentation are in place.
- Enforce MIME/size caps; scrub logs of file text/summary; structured error codes
- Record audit entries (metadata only) including provider/model/tokens/cost
- Expose basic metrics (latency, success/failure counts)
- Update docs: feature description, API paths, real-time contract; add `.env.example` for Polza keys and timeouts