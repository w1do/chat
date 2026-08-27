---
sessionId: session-260827-194129-hevn
---

# Requirements

### Overview & Goals
Add AI-powered summarization for a single message attachment (document/PDF) via long-press actions: show progress, then a modal with a concise 500–800 character summary and Send/Cancel. On confirm, publish the summary as a regular message in the same room.

### Scope
- In Scope:
  - Frontend long-press action “Анализировать с ИИ” for eligible attachments
  - Progress indicator while processing
  - Summary modal (500–800 chars) with Send/Cancel
  - Backend endpoint to summarize a single attachment via Polza with quotas/timeouts and standard error envelopes
  - OpenAPI update and generated client
- Out of Scope:
  - Multi-file summarization
  - Images/audio/video summarization
  - Automatic posting without confirmation

### User Stories
- As a room member, I can long-press a message with a PDF and request AI analysis to quickly understand its content.
- As a user, I decide whether to publish the resulting summary to the room.
- As an admin, I can disable AI or enforce quotas to control costs and privacy.

### Functional Requirements
- Action appears only for messages with at least one eligible attachment (PDF and common document MIME types).
- On request, UI shows a top progress indicator until completion or error.
- After processing, UI shows a modal with the AI summary (500–800 chars) and buttons: “Отправить” and “Не отправлять”.
- On Send, a normal text message is created in the same room with the summary; on Cancel, nothing is posted.
- Errors use a standard JSON error envelope and show a clear UI state.

### Non-Functional Requirements
- Privacy: Send only the attachment text to Polza; no room history; minimal audit data.
- Controls: Per-user rate limits/quotas; provider timeout and graceful error mapping.
- Accessibility: Modal is keyboard-navigable; buttons have accessible names.
- Localization: UI strings in Russian to match existing UI.

# Technical Design

### Current Implementation
- Frontend actions sheet: `packages/frontend/chat/src/components/mobile/MessageActionsSheet.tsx`
- Message model with `attachments`: `packages/frontend/chat/src/schemas/message.ts`
- AI backend package (Polza provider) under `packages/backend/ai` (conforms to DDD/CQRS-lite and provider abstractions)

### Key Decisions
- Endpoint: `POST /api/v1/ai/attachments/{attachment}/summary` (synchronous MVP) → returns `{ id, status, summary? }`. Rationale: simplest UI, fast feedback.
- Provider: Add `AttachmentSummaryProvider` adapter over Polza to enforce timeouts/quotas and keep Octane safety. Rationale: consistent abstraction with existing AI.
- Eligibility: PDF and common document MIME types; reject others with 400. Rationale: predictable quality and cost.
- Publish flow: Client confirmation modal; posting uses existing message-create API. Rationale: preserve user intent and audit.

### Proposed Changes
- Backend (AI package):
  - Presentation/Http: Controller + Form Request `SummarizeAttachmentRequestData` (DTO via `spatie/laravel-data`), Policy checks (room membership/attachment access), Resource for response.
  - Application: `SummarizeAttachmentCommand` + handler to extract text, call `AttachmentSummaryProvider`, record `ai_requests` audit, map provider errors (502/503/504) and timeouts (504), enforce quotas/rate limits (429).
  - Infrastructure: Text extraction for PDF/Office; provider adapter over Polza SDK/client.
  - OpenAPI: Path and schema additions under `packages/backend/ai/openapi/`.
- Frontend (chat package):
  - Add visibility predicate for eligible attachments.
  - Extend `MessageActionsSheet` with “Анализировать с ИИ” when eligible.
  - Mutation hook using generated client; show top progress while pending.
  - `SummaryModal` component enforcing 500–800 chars display; Send/Cancel actions.
  - On Send, call existing send-message API with summary body.

### Data Models / Contracts
- Request: none (path-only) or minimal options; server resolves attachment by ID/ULID.
- Response: `{ id: string, status: 'ok'|'error', summary?: string }` in success; error envelope for failures.

### Components
- Backend: `SummarizeAttachmentHandler`, `AttachmentSummaryProvider`, DTOs/Resources, Policy checks.
- Frontend: `MessageActionsSheet` new action, `useSummarizeAttachment` hook, `SummaryModal`.

### File Structure
- Backend: `packages/backend/ai/src/Presentation/Http/Api/V1/...`, `Application/Commands/...`, `Infrastructure/Providers/AttachmentSummaryProvider.php`, `openapi/paths/ai-attachment-summary.yaml`.
- Frontend: `packages/frontend/chat/src/components/mobile/MessageActionsSheet.tsx`, `components/modals/SummaryModal.tsx`, `hooks/useSummarizeAttachment.ts`, `schemas/` updates if needed.

### Risks
- Large/complex PDFs → enforce size/token caps, return 422 when exceeding.
- Extraction failures → fallback to unsupported error (400) with guidance.
- Provider latency/failure → progress UI + clear mapped errors; server timeouts with safe rollback.

# Testing

### Validation Approach
- Feature/API tests for endpoint success, ineligible types, authorization, rate limit, timeout/error mapping.
- Frontend component tests for action visibility, progress state, modal behavior, and message posting on confirm.
- E2E happy path: upload PDF → long-press → analyze → modal → send.

### Key Scenarios
- Eligible PDF yields 500–800 char summary and optional publish.
- Ineligible attachment returns 400 and UI shows error.
- 429 quota and 504 timeout paths.
- Forbidden access (403) blocked before provider call.

### Edge Cases
- Empty/unenforceable text extraction → 400 unsupported.
- Very long provider output → trimmed to 800 chars without mid-word cut.
- AI disabled at tenant level → action hidden; direct API → 503.

# Delivery Steps

###   Step 1: wire-backend-endpoint-and-provider
POST /api/v1/ai/attachments/{attachment}/summary returns a summary via Polza with quotas/timeouts and error envelopes.
- Add route, Form Request DTO, Policy checks, Resource response in `packages/backend/ai`.
- Implement `SummarizeAttachmentCommand` + handler with MIME/type/size eligibility and text extraction.
- Add `AttachmentSummaryProvider` adapter over Polza with timeout/quota enforcement.
- Map provider/infra errors to 5xx/504; add audit to `ai_requests`.
- Update OpenAPI path/schema and run validation.

###   Step 2: generate-client-and-integrate-frontend-api
Generated TypeScript client includes the new endpoint and is type-safe in the chat app.
- Regenerate `packages/frontend/api-client` from updated OpenAPI.
- Add `useSummarizeAttachment` mutation hook using the generated client.
- Display global/top progress while mutation is pending.

###   Step 3: add-ui-action-and-modal-flow
Long-press menu shows “Анализировать с ИИ” for eligible attachments; modal shows 500–800 char summary with Send/Cancel.
- Extend `MessageActionsSheet.tsx` with conditional action for eligible MIME types.
- Implement `SummaryModal` with length clamp and accessible controls.
- Wire modal to mutation result; on Send, publish via existing send-message API.

###   Step 4: policies-ratelimits-and-settings
Action is gated by AI enabled setting, with per-user rate limit/quota and clear errors.
- Add tenant-level AI enabled flag check; hide action when disabled; API returns 503 if called directly.
- Implement per-user rate limit/quota; return 429 when exceeded.
- Add tests for disabled/429 paths and UI states.

###   Step 5: tests-docs-and-e2e
Specs validated by tests; docs and changelog updated.
- Backend feature tests: success, ineligible, 403, 429, 5xx/504 mapping.
- Frontend tests: action visibility, progress, modal behavior, posting on confirm.
- E2E: upload PDF → analyze → modal → send; verify message appears.
- Update docs/features, SUMMARY, and OpenAPI changelog.