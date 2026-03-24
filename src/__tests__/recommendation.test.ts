import { describe, it, expect } from "vitest";
import { getRecommendation, resolveTargetPlatform } from "@/lib/services/recommendation";
import type { AnalysisResult } from "@/lib/schemas";

function makeAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    taskType: "coding",
    taskSubtype: null,
    complexityScore: 3,
    complexityLevel: "medium",
    complexityDrivers: [],
    suggestedPlatform: "generic",
    suggestedModel: "generic-model",
    suggestedMethodology: "standard approach",
    requiredCapabilities: {
      needsWebResearch: false,
      needsDeepResearch: false,
      needsAttachments: false,
      needsPriorContext: false,
      needsCodeEnvironment: false,
      needsCanvasLikeEditor: false,
      needsConnectors: false,
      needsLongContextModel: false,
    },
    missingInformation: [],
    risksOrWarnings: [],
    title: "Test",
    ...overrides,
  };
}

describe("getRecommendation", () => {
  it("recommends Claude for coding tasks", () => {
    const result = getRecommendation(makeAnalysis({ taskType: "coding" }));
    expect(result.platform).toBe("claude");
  });

  it("recommends Gemini for web research tasks", () => {
    const result = getRecommendation(
      makeAnalysis({
        taskType: "research",
        requiredCapabilities: {
          ...makeAnalysis().requiredCapabilities,
          needsWebResearch: true,
        },
      })
    );
    expect(result.platform).toBe("gemini");
  });

  it("recommends ChatGPT for design tasks", () => {
    const result = getRecommendation(makeAnalysis({ taskType: "design" }));
    expect(result.platform).toBe("chatgpt");
  });

  it("recommends Claude for automation tasks", () => {
    const result = getRecommendation(makeAnalysis({ taskType: "automation" }));
    expect(result.platform).toBe("claude");
  });

  it("falls back to Gemini suggestion for unmatched types", () => {
    const result = getRecommendation(
      makeAnalysis({
        taskType: "analysis",
        suggestedPlatform: "gemini",
        suggestedModel: "gemini-2.0-flash",
      })
    );
    expect(result.platform).toBe("gemini");
  });
});

describe("resolveTargetPlatform", () => {
  it("uses user choice when not auto", () => {
    const rec = { platform: "claude" as const, model: "test", methodology: "test" };
    expect(resolveTargetPlatform("chatgpt", rec)).toBe("chatgpt");
  });

  it("uses recommendation when auto", () => {
    const rec = { platform: "claude" as const, model: "test", methodology: "test" };
    expect(resolveTargetPlatform("auto", rec)).toBe("claude");
  });

  it("uses recommendation when empty", () => {
    const rec = { platform: "gemini" as const, model: "test", methodology: "test" };
    expect(resolveTargetPlatform("", rec)).toBe("gemini");
  });
});
