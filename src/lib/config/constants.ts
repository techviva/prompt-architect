export const ALLOWED_AUDIO_MIMETYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/webm",
  "audio/ogg",
  "audio/aac",
] as const;

export const ALLOWED_ATTACHMENT_MIMETYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/json",
] as const;

export const PROCESSING_STATUSES = [
  "uploaded",
  "queued",
  "transcribing",
  "analyzing",
  "generating_prompt",
  "completed",
  "failed",
] as const;

export const TARGET_PLATFORMS = [
  "auto",
  "chatgpt",
  "claude",
  "gemini",
  "generic",
] as const;

export const TASK_TYPES = [
  "research",
  "writing",
  "coding",
  "strategy",
  "operations",
  "analysis",
  "design",
  "automation",
  "document_editing",
  "planning",
  "continuation",
  "review_changes",
] as const;

export const COMPLEXITY_LEVELS = [
  "low",
  "medium",
  "high",
  "very_high",
] as const;

export const QUEUE_NAME = "audio-processing";

export const JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 5000,
  },
  timeout: 300000,
  removeOnComplete: false,
  removeOnFail: false,
};
