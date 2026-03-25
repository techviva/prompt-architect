// In-memory store for Vercel serverless deployment
// No external database required — data persists within the serverless function lifetime
// Client-side localStorage is used for persistent history

import crypto from "crypto";

export interface RequestRecord {
  id: string;
  title: string | null;
  status: string;
  targetPlatform: string;
  userContext: string | null;
  parentRequestId: string | null;
  continuationContext: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  audioAsset: {
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    durationSeconds: number | null;
  } | null;
  attachments: Array<{
    id: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
  }>;
  transcript: {
    rawTranscript: string;
    cleanedTranscript: string;
    language: string | null;
  } | null;
  analysis: {
    taskType: string;
    taskSubtype: string | null;
    complexityScore: number;
    complexityLevel: string;
    complexityDrivers: string[];
    suggestedPlatform: string;
    suggestedModel: string;
    suggestedMethodology: string;
    requiredCapabilities: Record<string, boolean>;
    missingInformation: string[];
    risksOrWarnings: string[];
    title: string;
  } | null;
  prompts: {
    platform: string;
    finalPrompt: string;
    followUpPrompt: string;
    revisionPrompt: string;
    templateUsed: string | null;
  } | null;
  job: {
    status: string;
    progress: number;
    startedAt: string | null;
    completedAt: string | null;
    failedAt: string | null;
    errorMessage: string | null;
    attempts: number;
  } | null;
}

// In-memory store (persists across warm invocations in Vercel)
const store = new Map<string, RequestRecord>();

export function createRequest(data: Partial<RequestRecord>): RequestRecord {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const record: RequestRecord = {
    id,
    title: data.title ?? null,
    status: data.status ?? "uploaded",
    targetPlatform: data.targetPlatform ?? "auto",
    userContext: data.userContext ?? null,
    parentRequestId: data.parentRequestId ?? null,
    continuationContext: data.continuationContext ?? null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    audioAsset: data.audioAsset ?? null,
    attachments: data.attachments ?? [],
    transcript: null,
    analysis: null,
    prompts: null,
    job: {
      status: "queued",
      progress: 0,
      startedAt: null,
      completedAt: null,
      failedAt: null,
      errorMessage: null,
      attempts: 0,
    },
  };
  store.set(id, record);
  return record;
}

export function getRequest(id: string): RequestRecord | null {
  return store.get(id) ?? null;
}

export function updateRequest(id: string, data: Partial<RequestRecord>): RequestRecord | null {
  const existing = store.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  store.set(id, updated);
  return updated;
}

export function listRequests(): RequestRecord[] {
  return Array.from(store.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function deleteRequest(id: string): boolean {
  return store.delete(id);
}
