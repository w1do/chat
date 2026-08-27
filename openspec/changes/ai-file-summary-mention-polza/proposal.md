## Why

Users often share contracts or lengthy documents in chat and need a quick, privacy‑respecting summary without leaving the conversation. An inline `@ai` action on a replied file reduces friction and speeds up decision‑making.

## What Changes

- Add an `@ai` inline action on a reply to a message with an attached file to request an AI summary.
- Integrate Polza service to analyze the replied file and produce a concise summary.
- Return a draft summary (500–800 characters) with a clear "publish to chat?" prompt rather than auto‑posting.
- Support common document types (PDF/docx/txt) with safe handling and size/type limits; reject unsupported files with a clear error.
- Enforce permissions, rate limits, quotas, and audit logging for AI actions.
- Broadcast progress/result states to the requesting user; optionally notify room when published.

## Capabilities

### New Capabilities
- `ai/file-summary`: Request an AI summary for the file attached to the replied message by typing `@ai` in the reply; returns a 500–800 character draft summary with an option to publish to the room.

### Modified Capabilities
- (none)

## Impact

- Backend (Laravel packages): `packages/backend/ai` (new use case, provider adapter for Polza), `packages/backend/chat` (trigger via message reply and publish flow), `packages/backend/notifications` (optional publish notification).
- HTTP API: new endpoint(s) under `/api/v1/ai/*` and/or chat action endpoint to initiate summary; OpenAPI and error contracts.
- Queues/Jobs: async Polza call with idempotency, timeout, retry/backoff, and `failed()` → audit.
- WebSocket: progress/result to requester; publish event when user confirms posting.
- Security/Privacy: file access checks, tenant isolation, rate limiting, quotas, audit log of AI actions; do not leak file contents in logs.
- Frontend: chat UI affordance for `@ai` on reply, draft summary display, confirm publish.
