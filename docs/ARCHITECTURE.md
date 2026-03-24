# Architecture — Prompt Architect

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                     │
│                   App Router + React                     │
│              Tailwind CSS + shadcn/ui                    │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────▼──────────────────────────────────┐
│                   API Layer (Next.js API Routes)         │
│                  Zod validation + Controllers            │
└───────┬──────────────────────────────────┬──────────────┘
        │                                  │
┌───────▼───────┐                 ┌────────▼─────────┐
│   PostgreSQL  │                 │   Redis + BullMQ  │
│   (Prisma)    │                 │   (Job Queue)     │
└───────────────┘                 └────────┬─────────┘
                                           │
                                  ┌────────▼─────────┐
                                  │   Worker Process   │
                                  │  (BullMQ Worker)   │
                                  └────────┬─────────┘
                                           │
                              ┌────────────┼────────────┐
                              │            │            │
                       ┌──────▼──┐  ┌──────▼──┐  ┌─────▼────┐
                       │ Storage  │  │ Gemini  │  │ Database │
                       │ Adapter  │  │   API   │  │ (Results)│
                       └─────────┘  └─────────┘  └──────────┘
```

## Design Decisions

### Monorepo with Clear Separation
Single Next.js application with a separate worker process. This accelerates MVP delivery while maintaining clean separation:
- `src/app/` — Next.js pages and API routes
- `src/lib/` — Domain logic, services, adapters
- `src/components/` — UI components
- `src/workers/` — Worker entry point and job processors

### Why Not a Separate Backend?
For the MVP, Next.js API routes provide sufficient backend capability. The worker runs as a separate process. This avoids the overhead of maintaining a separate Express/Fastify server while keeping the architecture ready for extraction.

### Storage Adapter Pattern
```typescript
interface StorageAdapter {
  upload(key: string, data: Buffer, contentType: string): Promise<string>
  download(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  getUrl(key: string): Promise<string>
}
```
- **Local**: Filesystem storage in `./uploads/`
- **S3-compatible**: MinIO, AWS S3, Cloudflare R2

### Queue System
BullMQ on Redis for async job processing:
- Audio processing jobs are enqueued on upload
- Worker process picks up jobs and runs the pipeline
- Job status is persisted and queryable via API
- Retry logic built into BullMQ

### AI Provider Adapter
```typescript
interface AIProvider {
  transcribe(audioUrl: string, mimeType: string): Promise<TranscriptResult>
  analyzeTask(transcript: string, context?: string): Promise<AnalysisResult>
  generatePrompt(analysis: AnalysisResult, platform: Platform): Promise<PromptPackage>
}
```
Currently only Gemini implementation, but adapter pattern allows future providers.

## Data Flow

### New Request Pipeline
1. User uploads audio + optional context
2. API validates input, stores audio via StorageAdapter
3. Creates Request + AudioAsset records in DB
4. Enqueues processing job in BullMQ
5. Worker picks up job:
   a. Updates status: `transcribing`
   b. Sends audio to Gemini for transcription
   c. Updates status: `analyzing`
   d. Sends transcript to Gemini for structured analysis
   e. Updates status: `generating_prompt`
   f. Generates platform-optimized prompts using templates
   g. Updates status: `completed`
   h. Persists all results to DB
6. Frontend polls job status and displays results

### Continuation Flow
1. User selects historical request
2. Adds new context / continuation notes
3. System creates new Request linked to parent
4. Worker generates continuation prompt using previous analysis + new context

## Security Model
- Server-side API key management via environment variables
- File upload validation (MIME type, size limits)
- Input sanitization via Zod schemas
- No client-side API keys
- Single-user mode for MVP (auth-ready architecture)

## Deployment Topology

### Local Development
```
docker compose up
```
- Next.js dev server (port 3000)
- PostgreSQL (port 5432)
- Redis (port 6379)
- Worker process

### Production Self-Hosted
- Same Docker Compose with production configs
- Optional: MinIO for S3-compatible storage
- Optional: Reverse proxy (nginx/caddy)

### Cloud Deploy
- Frontend: Vercel or any static host
- Backend API: Same Next.js or extracted
- Worker: Any server with Docker
- Database: Any PostgreSQL
- Queue: Any Redis
- Storage: Any S3-compatible
