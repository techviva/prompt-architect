-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('uploaded', 'queued', 'transcribing', 'analyzing', 'generating_prompt', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "TargetPlatform" AS ENUM ('auto', 'chatgpt', 'claude', 'gemini', 'generic');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('research', 'writing', 'coding', 'strategy', 'operations', 'analysis', 'design', 'automation', 'document_editing', 'planning', 'continuation', 'review_changes');

-- CreateEnum
CREATE TYPE "ComplexityLevel" AS ENUM ('low', 'medium', 'high', 'very_high');

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'uploaded',
    "targetPlatform" "TargetPlatform" NOT NULL DEFAULT 'auto',
    "userContext" TEXT,
    "parentRequestId" TEXT,
    "continuationContext" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioAsset" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationSeconds" DOUBLE PRECISION,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transcript" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "rawTranscript" TEXT NOT NULL,
    "cleanedTranscript" TEXT NOT NULL,
    "language" TEXT,
    "durationProcessed" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisResult" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "taskType" "TaskType" NOT NULL,
    "taskSubtype" TEXT,
    "complexityScore" INTEGER NOT NULL,
    "complexityLevel" "ComplexityLevel" NOT NULL,
    "complexityDrivers" JSONB NOT NULL,
    "suggestedPlatform" TEXT NOT NULL,
    "suggestedModel" TEXT NOT NULL,
    "suggestedMethodology" TEXT NOT NULL,
    "requiredCapabilities" JSONB NOT NULL,
    "missingInformation" JSONB NOT NULL,
    "risksOrWarnings" JSONB NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptArtifact" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "finalPrompt" TEXT NOT NULL,
    "followUpPrompt" TEXT NOT NULL,
    "revisionPrompt" TEXT NOT NULL,
    "templateUsed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessingJob" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "bullJobId" TEXT,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoryTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "HistoryTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestTag" (
    "requestId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "RequestTag_pkey" PRIMARY KEY ("requestId","tagId")
);

-- CreateTable
CREATE TABLE "UserSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Request_status_idx" ON "Request"("status");
CREATE INDEX "Request_createdAt_idx" ON "Request"("createdAt");
CREATE INDEX "Request_targetPlatform_idx" ON "Request"("targetPlatform");
CREATE INDEX "Request_parentRequestId_idx" ON "Request"("parentRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "AudioAsset_requestId_key" ON "AudioAsset"("requestId");
CREATE INDEX "Attachment_requestId_idx" ON "Attachment"("requestId");
CREATE UNIQUE INDEX "Transcript_requestId_key" ON "Transcript"("requestId");
CREATE UNIQUE INDEX "AnalysisResult_requestId_key" ON "AnalysisResult"("requestId");
CREATE INDEX "AnalysisResult_taskType_idx" ON "AnalysisResult"("taskType");
CREATE INDEX "AnalysisResult_complexityLevel_idx" ON "AnalysisResult"("complexityLevel");
CREATE UNIQUE INDEX "PromptArtifact_requestId_key" ON "PromptArtifact"("requestId");
CREATE UNIQUE INDEX "ProcessingJob_requestId_key" ON "ProcessingJob"("requestId");
CREATE UNIQUE INDEX "HistoryTag_name_key" ON "HistoryTag"("name");
CREATE UNIQUE INDEX "UserSetting_key_key" ON "UserSetting"("key");

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_parentRequestId_fkey" FOREIGN KEY ("parentRequestId") REFERENCES "Request"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AudioAsset" ADD CONSTRAINT "AudioAsset_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromptArtifact" ADD CONSTRAINT "PromptArtifact_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcessingJob" ADD CONSTRAINT "ProcessingJob_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequestTag" ADD CONSTRAINT "RequestTag_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequestTag" ADD CONSTRAINT "RequestTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "HistoryTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
