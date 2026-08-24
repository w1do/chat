---
name: polza-ai
description: "Polza AI API for transcription and embeddings"
license: MIT
metadata:
  author: UNIQDEVELOPER
---

# Polza AI Integration

This project uses the Polza AI API for specialized AI tasks, including audio transcription and generating embeddings for the RAG (Retrieval-Augmented Generation) system.

## Available Services

### 1. Transcription
Used to convert audio files into text. This is critical for indexing voice notes or meeting recordings into the knowledge base.
- **Reference**: See `.ai/skills/polza-ai/references/transcribe-guidelines.md` for API details and response schemas.

### 2. Embeddings
Used to convert text chunks into high-dimensional vectors for semantic search in Qdrant.
- **Reference**: See `.ai/skills/polza-ai/references/ebmeddings-guidelines.md` for vector dimensions and batching rules.

## Integration Rules (BotSync Standard)

- **Architecture**: All Polza AI client logic must reside in `app/Infrastructure/Services/AI/PolzaAiService.php`.
- **Error Handling**: Use the `PolzaAiException` to wrap API errors. Ensure that a failed AI request does not crash the entire application flow (use queues where appropriate).
- **Hardening**:
  - Securely store the `POLZA_AI_KEY` in `.env`.
  - Log request/response metadata (without leaking PII) for debugging.
  - Implement rate limiting to prevent cost overruns.
- **Data Integrity**: Ensure that embeddings are generated and updated consistently when source knowledge documents change.
