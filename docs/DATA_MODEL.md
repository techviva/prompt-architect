# Data Model — Prompt Architect

## Entity Relationship Diagram

```
User (future)
  │
  ├── 1:N → Request
  │          ├── 1:1 → AudioAsset
  │          ├── 1:N → Attachment
  │          ├── 1:1 → Transcript
  │          ├── 1:1 → AnalysisResult
  │          ├── 1:1 → PromptArtifact
  │          ├── 1:1 → ProcessingJob
  │          ├── N:N → HistoryTag
  │          └── self → parentRequest (revision chain)
  │
  └── 1:N → UserSetting
```

## Core Entities

### Request
The central entity. Represents one user submission.
- `id` (UUID, PK)
- `title` (auto-generated summary)
- `status` (enum: uploaded, queued, transcribing, analyzing, generating_prompt, completed, failed)
- `targetPlatform` (enum: auto, chatgpt, claude, gemini, generic)
- `userContext` (optional text provided by user)
- `parentRequestId` (FK, nullable — for continuation/revision chain)
- `continuationContext` (text — what happened since parent request)
- `errorMessage` (nullable)
- `createdAt`, `updatedAt`

### AudioAsset
- `id` (UUID, PK)
- `requestId` (FK, unique)
- `originalFilename`
- `mimeType`
- `sizeBytes`
- `durationSeconds` (nullable, extracted if possible)
- `storageKey` (adapter-agnostic key)
- `createdAt`

### Attachment
- `id` (UUID, PK)
- `requestId` (FK)
- `originalFilename`
- `mimeType`
- `sizeBytes`
- `storageKey`
- `createdAt`

### Transcript
- `id` (UUID, PK)
- `requestId` (FK, unique)
- `rawTranscript` (full text from Gemini)
- `cleanedTranscript` (processed/cleaned version)
- `language` (detected, nullable)
- `durationProcessed` (seconds, nullable)
- `createdAt`

### AnalysisResult
- `id` (UUID, PK)
- `requestId` (FK, unique)
- `taskType` (enum)
- `taskSubtype` (nullable)
- `complexityScore` (1-5)
- `complexityLevel` (enum: low, medium, high, very_high)
- `complexityDrivers` (JSON array)
- `suggestedPlatform` (enum)
- `suggestedModel` (string)
- `suggestedMethodology` (text)
- `requiredCapabilities` (JSON)
- `missingInformation` (JSON array)
- `risksOrWarnings` (JSON array)
- `createdAt`

### PromptArtifact
- `id` (UUID, PK)
- `requestId` (FK, unique)
- `platform` (enum — actual platform used)
- `finalPrompt` (text)
- `followUpPrompt` (text)
- `revisionPrompt` (text)
- `templateUsed` (string, nullable)
- `createdAt`

### ProcessingJob
- `id` (UUID, PK)
- `requestId` (FK, unique)
- `bullJobId` (string — BullMQ reference)
- `status` (enum)
- `progress` (0-100)
- `startedAt` (nullable)
- `completedAt` (nullable)
- `failedAt` (nullable)
- `errorMessage` (nullable)
- `attempts` (int)
- `createdAt`, `updatedAt`

### HistoryTag
- `id` (UUID, PK)
- `name` (string, unique)
- `color` (string, nullable)

### RequestTag (join table)
- `requestId` (FK)
- `tagId` (FK)

### UserSetting
- `id` (UUID, PK)
- `key` (string, unique)
- `value` (JSON)
- `updatedAt`

## Indexes
- `Request.status` — for filtering
- `Request.createdAt` — for sorting
- `Request.targetPlatform` — for filtering
- `Request.parentRequestId` — for chain lookups
- `AnalysisResult.taskType` — for filtering
- `AnalysisResult.complexityLevel` — for filtering
- `HistoryTag.name` — for lookups

## Notes
- All IDs use UUID v4 for portability
- JSON fields use Prisma's `Json` type (PostgreSQL JSONB)
- Timestamps use UTC
- Soft deletes not implemented in MVP (hard delete with cascade)
