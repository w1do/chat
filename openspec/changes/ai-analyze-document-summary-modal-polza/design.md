## Context
- Frontend long‑press opens `packages/frontend/chat/src/components/mobile/MessageActionsSheet.tsx` showing quick reactions and actions.
- Messages can include `attachments` with MIME types (`packages/frontend/chat/src/schemas/message.ts`).
- AI backend package exists at `packages/backend/ai` with Polza provider (`PolzaProvider`, configured via `config/ai.php`), and `ai_requests` audit table.
- Existing AI HTTP contract targets text revisions; we add a dedicated attachment summary endpoint.

## Goals / Non-Goals

**Goals:**
- Add an action to analyze a single eligible attachment and show a modal summary (500–800 chars) with send/cancel.
- Implement a backend endpoint that streams/awaits Polza, enforces quotas/timeouts, and records minimal audit data.
- Publish the summary as a normal chat message on confirm.

**Non-Goals:**
- Multi‑file summarization or combining multiple attachments.
- Summarization of images/audio/video.
- Automatic posting without user confirmation.

## Decisions

1) Endpoint shape and routing
- Decision: `POST /api/v1/ai/attachments/{attachment}/summary` → returns `{ id, status, summary? }` with synchronous execution for MVP; 429/5xx mapped to error envelope.
- Alternatives: Async job with polling; rejected for MVP due to added latency and UI complexity.

2) Provider integration
- Decision: Use existing `PolzaProvider` behind `TextRevisionProvider`‑like adapter `AttachmentSummaryProvider` to isolate prompt/payload and enforce timeouts/quotas.
- Alternatives: Call Polza directly from handler; rejected to keep consistent provider abstraction and Octane safety.

3) Security and privacy
- Decision: Download the attachment via signed backend URL or storage driver, extract text (PDF/Office), strip non‑text, and send only necessary text to Polza. Do not send room history.
- Alternatives: Client uploads file to Polza; rejected (secrets, privacy, CORS, policy).

4) UI composition
- Decision: Add a new row in `MessageActionsSheet` visible only when `message.attachments` includes eligible MIME; show top progress via `ChatScreen` state (TanStack Query mutation status) and a `SummaryModal` component; length constrained client‑side as final guard.
- Alternatives: Add within composer; rejected to keep gesture‑initiated flow.

## Risks / Trade-offs
- [Large files] → Mitigation: size cap and page/text token limit; return 422 when over limit.
- [Extraction quality] → Mitigation: use robust PDF/text extraction library; fallback to “unsupported” when no text.
- [Provider latency] → Mitigation: UI progress with cancel; backend timeout with clear error.
- [Quota abuse] → Mitigation: per‑user rate limit and quota counters in `ai_requests`.

## Migration Plan
- Add endpoint, config toggles, and feature flag in admin settings (AI enabled).
- OpenAPI update → regenerate frontend API client.
- Deploy; no data migration beyond existing `ai_requests`.

## Open Questions
- Should summary include a link back to the source attachment automatically? (Default: no; UI can add manually in future.)
