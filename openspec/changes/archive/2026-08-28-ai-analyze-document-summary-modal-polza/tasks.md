## 1. Backend API and Provider Wiring

- [ ] 1.1 Add `POST /api/v1/ai/attachments/{attachment}/summary` to AI package routes; verify route appears via `php artisan route:list` and OpenAPI path stub exists.
- [ ] 1.2 Implement `SummarizeAttachmentCommand` and handler with MIME/type/size eligibility checks; verify unit test covers eligible/ineligible cases.
- [ ] 1.3 Implement `AttachmentSummaryProvider` adapter on top of `PolzaProvider` with timeout/limits; verify provider fake test asserts timeout mapping and quota errors (429).
- [ ] 1.4 Enforce authorization (room membership, attachment access) via Policy; verify forbidden test (403) passes and no provider call made.
- [ ] 1.5 Record minimal `ai_requests` entry and admin audit on success/failure; verify DB entries via feature test assertions.
- [ ] 1.6 Map provider/infra errors to standard error envelope (502/503/504); verify feature tests for each mapping.

## 2. OpenAPI and Client

- [ ] 2.1 Document request/response and errors in `packages/backend/ai/openapi/paths/ai-attachment-summary.yaml`; verify `openspec` and OpenAPI validation succeed.
- [ ] 2.2 Regenerate `packages/frontend/api-client`; verify types include the new endpoint and typecheck passes.

## 3. Frontend UI and Flow

- [ ] 3.1 Expose a predicate for eligible attachments (PDF/office MIME) in `packages/frontend/chat` and unit‑test it.
- [ ] 3.2 Add “Анализировать с ИИ” action to `MessageActionsSheet` when eligible; verify it appears only for eligible messages in component tests.
- [ ] 3.3 Add mutation hook to call the new endpoint; show top progress indicator in `ChatScreen`; verify progress visible while pending in tests.
- [ ] 3.4 Implement `SummaryModal` (500–800 chars) with “Отправить/Не отправлять”; verify length clamped and actions work in component tests.
- [ ] 3.5 On confirm, post summary via existing message create API; verify a new message renders in Feed test and optimistic state reconciles.

## 4. Policies, Settings, and Rate Limits

- [ ] 4.1 Gate the action behind per‑tenant AI enabled setting; verify disabled state hides action and returns 503 for direct API calls.
- [ ] 4.2 Add per‑user rate limit/quota; verify 429 path in feature test and UI error state.

## 5. Documentation and Release

- [ ] 5.1 Update docs/features with UX, permissions, and error cases; verify CI docs check passes.
- [ ] 5.2 Update OpenAPI changelog and `SUMMARY.md`; verify no uncommitted diff after client generation.
- [ ] 5.3 Add E2E: upload PDF → long‑press → analyze → modal → send; verify summary appears and no PII/order violations.
