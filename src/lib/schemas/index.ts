import { z } from "zod";
import {
  PROCESSING_STATUSES,
  TARGET_PLATFORMS,
  TASK_TYPES,
  COMPLEXITY_LEVELS,
} from "@/lib/config/constants";

// ── Enums ──
export const ProcessingStatus = z.enum(PROCESSING_STATUSES);
export type ProcessingStatus = z.infer<typeof ProcessingStatus>;

export const TargetPlatform = z.enum(TARGET_PLATFORMS);
export type TargetPlatform = z.infer<typeof TargetPlatform>;

export const TaskType = z.enum(TASK_TYPES);
export type TaskType = z.infer<typeof TaskType>;

export const ComplexityLevel = z.enum(COMPLEXITY_LEVELS);
export type ComplexityLevel = z.infer<typeof ComplexityLevel>;

// ── Transcript Result ──
export const TranscriptResultSchema = z.object({
  rawTranscript: z.string(),
  cleanedTranscript: z.string(),
  language: z.string().nullable().default(null),
  durationProcessed: z.number().nullable().default(null),
});
export type TranscriptResult = z.infer<typeof TranscriptResultSchema>;

// ── Required Capabilities ──
export const RequiredCapabilitiesSchema = z.object({
  needsWebResearch: z.boolean().default(false),
  needsDeepResearch: z.boolean().default(false),
  needsAttachments: z.boolean().default(false),
  needsPriorContext: z.boolean().default(false),
  needsCodeEnvironment: z.boolean().default(false),
  needsCanvasLikeEditor: z.boolean().default(false),
  needsConnectors: z.boolean().default(false),
  needsLongContextModel: z.boolean().default(false),
});
export type RequiredCapabilities = z.infer<typeof RequiredCapabilitiesSchema>;

// ── Analysis Result ──
export const AnalysisResultSchema = z.object({
  taskType: TaskType,
  taskSubtype: z.string().nullable().default(null),
  complexityScore: z.number().int().min(1).max(5),
  complexityLevel: ComplexityLevel,
  complexityDrivers: z.array(z.string()),
  suggestedPlatform: z.enum(["chatgpt", "claude", "gemini", "generic"]),
  suggestedModel: z.string(),
  suggestedMethodology: z.string(),
  requiredCapabilities: RequiredCapabilitiesSchema,
  missingInformation: z.array(z.string()),
  risksOrWarnings: z.array(z.string()),
  title: z.string(),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

// ── Prompt Package ──
export const PromptPackageSchema = z.object({
  platform: z.enum(["chatgpt", "claude", "gemini", "generic"]),
  finalPrompt: z.string(),
  followUpPrompt: z.string(),
  revisionPrompt: z.string(),
  templateUsed: z.string().nullable().default(null),
});
export type PromptPackage = z.infer<typeof PromptPackageSchema>;

// ── API Request Schemas ──
export const CreateRequestSchema = z.object({
  targetPlatform: TargetPlatform.default("auto"),
  userContext: z.string().max(10000).optional().default(""),
  parentRequestId: z.string().uuid().optional(),
  continuationContext: z.string().max(10000).optional().default(""),
});
export type CreateRequestInput = z.infer<typeof CreateRequestSchema>;

// ── API Response Schemas ──
export const RequestSummarySchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  status: ProcessingStatus,
  targetPlatform: TargetPlatform,
  createdAt: z.string(),
  taskType: TaskType.nullable().optional(),
  complexityLevel: ComplexityLevel.nullable().optional(),
  parentRequestId: z.string().nullable().optional(),
});
export type RequestSummary = z.infer<typeof RequestSummarySchema>;

// ── History Filters ──
export const HistoryFiltersSchema = z.object({
  search: z.string().optional(),
  taskType: TaskType.optional(),
  platform: TargetPlatform.optional(),
  complexityLevel: ComplexityLevel.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type HistoryFilters = z.infer<typeof HistoryFiltersSchema>;
