## Context

- Monorepo with Laravel backend packages; DDD + CQRS-lite + DTO across `packages/backend/*`.
- Existing domains: `Chat` (rooms/messages) and `AI` (providers, use cases). Real-time via Reverb; queues via Redis/Horizon; SPA auth via Sanctum.
- Privacy constraints: send minimum data to providers; audit without sensitive text. Octane safety: no request-scoped state leakage.

## Goals / Non-Goals

**Goals:**
- Add a new AI use case to summarize a replied message’s attached file via Polza.
- Expose a HTTP endpoint to initiate the summary and deliver result as a draft; publish only on explicit confirmation.
- Provide real-time progress/completion to the requester and HTTP resync.
- Enforce permissions, rate limit/quotas, idempotency, timeouts, and audit logging.

**Non-Goals:**
- General file OCR or multi-file summarization.
- Automatic publishing of summaries without user confirmation.
- Vendor lock-in abstractions beyond a simple `TextRevisionProvider`-style contract for this capability.

## Decisions

1) Boundary and layering
- Implement initiation and orchestration in `packages/backend/ai` (new `SummarizeFileCommand` + handler, DTOs), triggered by chat context (replied message/file).
- Chat package remains source of truth for messages/publish flow; AI package returns draft content to caller.
- Rationale: preserves domain boundaries; AI focuses on provider logic and quotas, Chat on message lifecycle.

2) Provider integration
- Add Polza adapter under `packages/backend/ai/src/Infrastructure/Providers/Polza/` implementing a `FileSummaryProvider` contract (separate from text-revision to avoid overloading semantics).
- Rationale: file transfer and limits differ from text revision; keeping a clear provider interface avoids leaky abstractions.
- Alternatives: reuse `TextRevisionProvider` with a mode flag (rejected: conflates contracts and validation paths).

3) Transport and DTOs
- Presentation validates: room, replied message id, presence of supported file, optional idempotency key; uses spatie `Data` DTOs for request/response.
- Return operation id + draft summary on completion or pending status for async polling; push events via Reverb to requester.

4) Asynchrony and idempotency
- Initiation returns `202 Accepted` with operation id when enqueued; synchronous `200` allowed only if result is immediately available (cache/hit).
- Idempotency enforced by `(project_id, requester_id, replied_message_id, idempotency_key)` unique lock; job is re-entrant and deduplicated.

5) Timeouts, retries, failures
- Job timeout < provider timeout < queue retry_after; implement backoff and `failed()` → audit entry with failure reason.
- Circuit-breaker‑like short-circuit on repeated provider failures using cache key.

6) Security and privacy
- Verify room membership and file access; stream only needed file bytes to provider; scrub logs; audit without sensitive payloads.
- Rate limit per user and per project; enforce max file size and mime whitelist.

7) Events and API shape
- HTTP: `POST /api/v1/ai/file-summaries` to initiate; `POST /api/v1/ai/file-summaries/{id}/publish` to confirm publish.
- Reverb events to requester: `ai.file_summary.updated.v1 {id,status,progress}`; published message uses existing chat events.

## Risks / Trade-offs

- Provider variability → summary length drift → enforce post-processing clamp [Mitigation: trim to 500–800 chars, preserve sentence integrity].
- Large files → cost/timeouts [Mitigation: strict size cap; reject early].
- Duplicate requests spam [Mitigation: idempotency key + locks + rate limits].
- Privacy leakage in logs [Mitigation: structured error codes; no body/file text in logs].
- Chat/AI cross-domain coupling [Mitigation: contracts/DTOs at package boundary; no direct model reach-through].

## High-Level Flow

- Controller (AI) validates request (room, replied message id, @ai intent) → `SummarizeFileCommand`.
- Handler resolves file, authorizes, records `ai_requests` row, enqueues `SummarizeFileJob`.
- Job downloads file (scoped), calls `PolzaFileSummaryClient->summarize()`, clamps text, updates `ai_requests`, emits event to requester.
- On publish confirm, Chat controller posts the draft as a normal message authored by requester.
