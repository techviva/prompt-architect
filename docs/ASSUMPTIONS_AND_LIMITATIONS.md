# Assumptions and Limitations

## Assumptions

### Technical
- Node.js 20+ available in runtime environment
- Docker available for local development
- PostgreSQL 15+ for database
- Redis 7+ for job queue
- Gemini API accessible from server

### Product
- Single-user mode for MVP (no multi-tenancy)
- Audio files uploaded as files (no in-browser recording for MVP)
- English as primary language, other languages best-effort
- Users understand AI platforms at a basic level
- Maximum audio length: 60 minutes
- Maximum file size: 100MB for audio, 25MB for attachments

### AI/ML
- Gemini Flash model provides adequate transcription quality
- Gemini can reliably produce structured JSON output
- Task taxonomy covers 90%+ of typical AI-assisted tasks
- Complexity scoring is approximate and directional, not precise

## Limitations

### MVP Scope
- No real-time audio recording (upload only)
- No multi-user authentication (single-user mode)
- No WebSocket for real-time updates (polling-based)
- No actual integration with target platforms (generates prompts only)
- Attachment content is not analyzed in MVP (metadata only)
- No batch processing of multiple audios
- No API rate limiting (single-user assumption)

### Technical
- Gemini API required for core functionality (no offline mode)
- Large audio files may take significant processing time
- Job queue requires Redis (no in-memory fallback for production)
- No horizontal scaling of workers in MVP Docker Compose setup

### AI Quality
- Transcription quality depends on audio quality and language
- Task classification may be inaccurate for ambiguous requests
- Complexity scoring is heuristic-based, not calibrated
- Platform recommendations are rule-based + LLM, not ML-optimized
- Prompt templates are initial versions, not A/B tested

## Design Trade-offs

| Decision | Trade-off | Rationale |
|----------|-----------|-----------|
| Next.js API routes vs separate backend | Less flexibility, simpler deployment | MVP speed, can extract later |
| Polling vs WebSocket | Higher latency for status updates | Simpler implementation, good enough for MVP |
| Single worker process | No parallel job processing | Sufficient for single-user MVP |
| Gemini-only | No fallback AI provider | Reduces scope, adapter pattern allows future additions |
| shadcn/ui | Opinionated component styling | Rapid development, professional look, customizable |

## Known Risks
1. **Gemini API changes**: SDK is relatively new, API may change
2. **Audio format support**: Gemini may not support all audio formats
3. **Cost**: Long audio transcription may be expensive at scale
4. **Prompt quality**: Generated prompts need real-world validation
5. **Mobile file upload**: Some mobile browsers have quirks with file uploads
