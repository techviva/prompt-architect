import { describe, it, expect } from "vitest";
import {
  TranscriptResultSchema,
  AnalysisResultSchema,
  PromptPackageSchema,
  CreateRequestSchema,
  HistoryFiltersSchema,
} from "@/lib/schemas";

describe("TranscriptResultSchema", () => {
  it("validates a valid transcript result", () => {
    const input = {
      rawTranscript: "Hello, um, I want to build an app",
      cleanedTranscript: "Hello, I want to build an app",
      language: "en",
      durationProcessed: 15.5,
    };
    expect(TranscriptResultSchema.parse(input)).toEqual(input);
  });

  it("accepts null language", () => {
    const input = {
      rawTranscript: "test",
      cleanedTranscript: "test",
      language: null,
      durationProcessed: null,
    };
    expect(TranscriptResultSchema.parse(input)).toBeTruthy();
  });

  it("rejects missing required fields", () => {
    expect(() => TranscriptResultSchema.parse({})).toThrow();
  });
});

describe("AnalysisResultSchema", () => {
  it("validates a complete analysis result", () => {
    const input = {
      taskType: "coding",
      taskSubtype: "web development",
      complexityScore: 3,
      complexityLevel: "medium",
      complexityDrivers: ["Multiple components", "API integration"],
      suggestedPlatform: "claude",
      suggestedModel: "claude-sonnet-4-20250514",
      suggestedMethodology: "Break into components, implement iteratively",
      requiredCapabilities: {
        needsWebResearch: false,
        needsDeepResearch: false,
        needsAttachments: false,
        needsPriorContext: false,
        needsCodeEnvironment: true,
        needsCanvasLikeEditor: false,
        needsConnectors: false,
        needsLongContextModel: false,
      },
      missingInformation: ["Tech stack preference"],
      risksOrWarnings: ["Scope may be larger than described"],
      title: "Build a web application",
      distilledObjective: "Build a web application for project management",
      deliverables: ["Working web app", "API documentation"],
      keyConstraints: ["Use TypeScript"],
      executionRules: ["Follow TDD approach"],
      outputLanguage: "en",
      preferredOutputFormat: null,
    };
    expect(AnalysisResultSchema.parse(input)).toEqual(input);
  });

  it("rejects invalid complexity score", () => {
    const input = {
      taskType: "coding",
      complexityScore: 6,
      complexityLevel: "medium",
      complexityDrivers: [],
      suggestedPlatform: "claude",
      suggestedModel: "test",
      suggestedMethodology: "test",
      requiredCapabilities: {},
      missingInformation: [],
      risksOrWarnings: [],
      title: "test",
    };
    expect(() => AnalysisResultSchema.parse(input)).toThrow();
  });

  it("rejects invalid task type", () => {
    const input = {
      taskType: "invalid_type",
      complexityScore: 3,
      complexityLevel: "medium",
      complexityDrivers: [],
      suggestedPlatform: "claude",
      suggestedModel: "test",
      suggestedMethodology: "test",
      requiredCapabilities: {},
      missingInformation: [],
      risksOrWarnings: [],
      title: "test",
    };
    expect(() => AnalysisResultSchema.parse(input)).toThrow();
  });
});

describe("PromptPackageSchema", () => {
  it("validates a prompt package", () => {
    const input = {
      platform: "claude",
      finalPrompt: "Act as a senior engineer...",
      followUpPrompt: "Continue from where we left off...",
      revisionPrompt: "Please revise the following...",
      templateUsed: "claude-initial-v1",
    };
    expect(PromptPackageSchema.parse(input)).toEqual(input);
  });
});

describe("CreateRequestSchema", () => {
  it("provides defaults", () => {
    const result = CreateRequestSchema.parse({});
    expect(result.targetPlatform).toBe("auto");
    expect(result.userContext).toBe("");
  });

  it("validates platform values", () => {
    expect(CreateRequestSchema.parse({ targetPlatform: "claude" }).targetPlatform).toBe("claude");
    expect(() => CreateRequestSchema.parse({ targetPlatform: "invalid" })).toThrow();
  });
});

describe("HistoryFiltersSchema", () => {
  it("provides defaults", () => {
    const result = HistoryFiltersSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("coerces string numbers", () => {
    const result = HistoryFiltersSchema.parse({ page: "3", pageSize: "10" });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(10);
  });
});
