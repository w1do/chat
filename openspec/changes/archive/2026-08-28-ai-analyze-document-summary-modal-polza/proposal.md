## Why

Users share documents and PDFs and need a quick way to get a concise AI summary without leaving the chat. Long‑press actions already exist; adding AI analysis there keeps the flow fast and consistent with the product’s AI direction (Polza provider).

## What Changes

- Add a new long‑press action in the message actions sheet: “Анализировать с ИИ” when the message contains a document/PDF attachment.
- Show a top progress indicator (“Анализирую…”) while the AI summarizes the attachment.
- After completion, display a modal with a 500–800‑character SUMMARY of the document and ask whether to publish it to the room.
- Buttons: “Отправить” posts the summary as a new message; “Не отправлять” closes the modal.
- Use Polza AI provider for the analysis; include audit and rate limits consistent with AI package rules.
- Update OpenAPI (new endpoint) and generated client; add feature tests and contract tests.

## Capabilities

### New Capabilities
- ai/attachment-summary: Summarize a single document/PDF attachment via Polza and optionally publish the summary to the chat.

### Modified Capabilities
- <none>

## Impact

- Backend (packages/backend/ai): new command/handler and HTTP endpoint to summarize an attachment using the configured Polza provider; store minimal request metadata in `ai_requests` and record audit entries.
- Backend (packages/backend/chat): posting the summary as a normal text message in the same room, attributed to the requesting user (not AI), with a note in audit that AI assisted.
- OpenAPI: add `/ai/attachments/{attachment}/summary` and success/error envelopes; document 429/5xx behavior.
- Frontend (packages/frontend/chat):
  - `MessageActionsSheet` adds the action when an attachment is a document/PDF.
  - A top inline progress indicator while awaiting the result.
  - A modal rendering 500–800 characters; “Отправить/Не отправлять”.
  - On send, call existing message create API with the summary.
- Policies/Permissions: action available to room members with upload/view rights; respects per‑tenant AI settings and quotas.
