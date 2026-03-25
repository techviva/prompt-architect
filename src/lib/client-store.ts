"use client";

// Client-side localStorage persistence for request history
// This allows history to survive across page reloads and serverless cold starts

const STORAGE_KEY = "prompt-architect-history";

export interface StoredRequest {
  id: string;
  title: string | null;
  status: string;
  targetPlatform: string;
  createdAt: string;
  updatedAt: string;
  userContext: string | null;
  parentRequestId: string | null;
  continuationContext: string | null;
  errorMessage: string | null;
  audioAsset: {
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
  } | null;
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
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadHistory(): StoredRequest[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredRequest[];
  } catch {
    return [];
  }
}

export function saveToHistory(request: StoredRequest): void {
  if (!isBrowser()) return;
  try {
    const history = loadHistory();
    const existing = history.findIndex((r) => r.id === request.id);
    if (existing >= 0) {
      history[existing] = request;
    } else {
      history.unshift(request);
    }
    // Keep max 100 items
    const trimmed = history.slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function getFromHistory(id: string): StoredRequest | null {
  const history = loadHistory();
  return history.find((r) => r.id === id) ?? null;
}

export function removeFromHistory(id: string): void {
  if (!isBrowser()) return;
  try {
    const history = loadHistory().filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
}
