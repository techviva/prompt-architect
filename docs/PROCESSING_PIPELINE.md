# Processing Pipeline — Prompt Architect

## Pipeline Overview

```
Upload → Storage → Enqueue → Transcribe → Analyze → Recommend → Generate → Persist
```

## Detailed Steps

### Step 1: Upload & Validation
**Trigger**: User submits form with audio file
**Actions**:
1. Validate file MIME type against allowlist (audio/mpeg, audio/wav, audio/mp4, audio/webm, audio/ogg)
2. Validate file size (max 100MB)
3. Generate unique storage key
4. Upload file via StorageAdapter
5. Create `Request` record (status: `uploaded`)
6. Create `AudioAsset` record
7. Create any `Attachment` records
8. Return request ID to client

### Step 2: Job Enqueue
**Trigger**: Successful upload
**Actions**:
1. Create `ProcessingJob` record (status: `queued`)
2. Add job to BullMQ queue with request ID
3. Update `Request` status to `queued`
4. Return job ID for polling

### Step 3: Transcription
**Trigger**: Worker picks up job
**Actions**:
1. Update status to `transcribing`
2. Download audio from storage
3. Upload audio to Gemini File API (for large files)
4. Send transcription prompt to Gemini with audio
5. Parse response into raw transcript
6. Clean transcript (remove filler words, fix formatting)
7. Create `Transcript` record
8. Update job progress (33%)

**Gemini Integration**:
- Use `gemini-2.0-flash` for transcription
- Upload via File API for files > 20MB
- Inline data for smaller files
- Prompt: structured request for clean transcription with language detection

**Error Handling**:
- Retry up to 3 times with exponential backoff
- On permanent failure: mark job as `failed` with error message

### Step 4: Task Analysis
**Trigger**: Successful transcription
**Actions**:
1. Update status to `analyzing`
2. Send cleaned transcript + user context to Gemini
3. Request structured JSON analysis:
   - Task type classification
   - Complexity scoring
   - Required capabilities identification
   - Missing information detection
   - Risk assessment
4. Validate response against Zod schema
5. Create `AnalysisResult` record
6. Update job progress (66%)

**Analysis Prompt Strategy**:
- System prompt with taxonomy definitions
- Few-shot examples for each task type
- Explicit JSON schema in prompt
- Temperature: 0.3 for consistency

### Step 5: Recommendation Engine
**Trigger**: Successful analysis
**Actions**:
1. Apply deterministic rules based on analysis:
   - Coding tasks → Claude (code-heavy) or ChatGPT (general)
   - Research tasks → Gemini (grounding) or ChatGPT (browsing)
   - Writing tasks → Claude (long-form) or ChatGPT (creative)
   - Complex tasks → prefer models with larger context
2. Check user's target platform preference
3. If `auto`: use recommendation; else: use user's choice
4. Select specific model within platform
5. Determine methodology (single prompt, chain, iterative, etc.)

### Step 6: Prompt Generation
**Trigger**: Successful recommendation
**Actions**:
1. Update status to `generating_prompt`
2. Select template set for target platform
3. Build prompt context from:
   - Cleaned transcript
   - Analysis results
   - User context
   - Parent request context (if continuation)
   - Platform-specific best practices
4. Generate via template + LLM refinement:
   - `finalPrompt`: The main working prompt
   - `followUpPrompt`: For continuing the conversation
   - `revisionPrompt`: For requesting changes
5. Create `PromptArtifact` record
6. Update job progress (100%)
7. Update status to `completed`

### Step 7: Completion
**Actions**:
1. Update `ProcessingJob` with completion timestamp
2. Update `Request` status to `completed`
3. Generate title/summary from transcript
4. Client polling picks up completed status

## Error States

| Error | Handling |
|-------|----------|
| Invalid audio format | Reject at upload, never enqueue |
| Gemini API timeout | Retry with backoff (3 attempts) |
| Gemini rate limit | Retry with longer backoff |
| Invalid JSON from Gemini | Retry with stricter prompt |
| Storage failure | Retry, then fail job |
| Database failure | Fail job, log error |

## Job Configuration
```typescript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000, // 5s, 10s, 20s
  },
  timeout: 300000, // 5 minutes max per job
  removeOnComplete: false,
  removeOnFail: false,
}
```

## Continuation Pipeline
When processing a continuation request:
1. Load parent request's analysis and transcript
2. Combine with new context and continuation notes
3. Skip to Step 4 (analysis) with enriched context
4. Generate continuation-specific prompts
5. Link via `parentRequestId`
