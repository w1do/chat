## 1. Contracts and OpenAPI

- [x] 1.1 Define request/response DTOs for `POST /api/v1/ai/file-summaries` and verify OpenAPI is updated and passes validation (`openspec validate`)
- [x] 1.2 Define publish confirm DTOs for `POST /api/v1/ai/file-summaries/{id}/publish` and verify OpenAPI validation passes

## 2. Authorization, Validation, and Rate Limits

- [x] 2.1 Implement Form Request validating room membership, replied message id, file presence/type/size, idempotency key; verify feature tests return 422 on invalid input
- [x] 2.2 Add Policy checks for room access and file read; verify 403 feature tests for non-members
- [x] 2.3 Add per-user and per-project rate limits; verify 429 feature test on exceeded quota

## 3. AI Domain Use Case

- [x] 3.1 Add `SummarizeFileCommand` + handler in `packages/backend/ai` and verify unit test creates an `ai_requests` record and enqueues a job
- [x] 3.2 Implement `FileSummaryProvider` contract and Polza adapter; verify integration test (with fake client) returns a normalized summary string
- [x] 3.3 Clamp summary length to 500–800 characters preserving sentences; verify unit tests for boundary lengths

## 4. Job, Idempotency, and Reliability

- [x] 4.1 Implement `SummarizeFileJob` with timeout/backoff and unique lock; verify duplicate submissions return same operation id in feature test
- [x] 4.2 Implement provider call, error mapping, and timeout handling; verify timeout test marks operation failed with error code
- [x] 4.3 Implement `failed()` audit logging; verify audit record exists without sensitive content in feature test

## 5. Presentation Layer and Real-time

- [x] 5.1 Implement controller for initiate endpoint returning 202 + operation id; verify feature test enqueues job and returns operation id
- [x] 5.2 Emit Reverb event `ai.file_summary.updated.v1` to requester on progress/completion; verify event payload contract test
- [x] 5.3 Implement HTTP resync endpoint to fetch operation status/draft; verify feature test after simulated reconnect

## 6. Draft and Publish Flow (Chat)

- [x] 6.1 Store draft summary associated with requester and operation; verify it is retrievable and not visible to other users until publish
- [x] 6.2 Implement publish endpoint that posts summary as requester’s message; verify message appears in room and normal chat events fire

## 7. Security, Observability, and Docs

- [x] 7.1 Scrub logs and ensure no file or summary text is logged; verify by inspecting logs during tests
- [x] 7.2 Add measurements for latency, success/failure counts; verify metrics counters increment in integration test (or faked sink)
- [x] 7.3 Update docs: feature description, API sections, and real-time contracts; verify docs build and lint pass
- [x] 7.4 Add configuration keys for Polza provider (endpoint, API key, timeouts) with `.env.example` updates; verify boot with missing keys fails clearly in dev

## 8. Tests and CI

- [x] 8.1 Unit tests: handlers, provider adapter, length clamping; verify unit suite green
- [x] 8.2 Feature tests: endpoints happy path, invalid input, forbidden, rate limit, timeout/failure; verify feature suite green
- [x] 8.3 Contract tests: OpenAPI and real-time schema; verify contract suite green
- [x] 8.4 E2E (critical path): two users in room, upload file, requester `@ai`, gets draft, confirms publish; verify Playwright scenario passes
