import { describe, it, expect } from "vitest";
import { generatePromptPackage } from "@/lib/templates";
import type { AnalysisResult } from "@/lib/schemas";

const mockAnalysis: AnalysisResult = {
  taskType: "coding",
  taskSubtype: "web development",
  complexityScore: 3,
  complexityLevel: "medium",
  complexityDrivers: ["Multiple components needed", "API integration required"],
  suggestedPlatform: "claude",
  suggestedModel: "claude-sonnet-4-20250514",
  suggestedMethodology:
    "Break the project into components, implement the data layer first, then the UI, and finally integrate the API.",
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
  missingInformation: ["Preferred database", "Authentication requirements"],
  risksOrWarnings: ["Scope may expand beyond initial description"],
  title: "Build a task management web app",
};

describe("generatePromptPackage", () => {
  it("generates prompts for Claude platform", () => {
    const result = generatePromptPackage(
      "I want to build a task management web app with drag and drop.",
      mockAnalysis,
      "claude"
    );

    expect(result.finalPrompt).toContain("senior software engineer");
    expect(result.finalPrompt).toContain("<task>");
    expect(result.finalPrompt).toContain("<methodology>");
    expect(result.followUpPrompt).toContain("Build a task management web app");
    expect(result.revisionPrompt).toContain("revision request");
    expect(result.templateUsed).toBe("claude-initial-v1");
  });

  it("generates prompts for ChatGPT platform", () => {
    const result = generatePromptPackage(
      "I want to build a task management web app.",
      mockAnalysis,
      "chatgpt"
    );

    expect(result.finalPrompt).toContain("**Role**");
    expect(result.finalPrompt).toContain("**Task**");
    expect(result.finalPrompt).not.toContain("<task>");
  });

  it("generates prompts for Gemini platform", () => {
    const result = generatePromptPackage(
      "I want to build a task management web app.",
      mockAnalysis,
      "gemini"
    );

    expect(result.finalPrompt).toBeTruthy();
    expect(result.followUpPrompt).toBeTruthy();
    expect(result.revisionPrompt).toBeTruthy();
  });

  it("generates prompts for Generic platform", () => {
    const result = generatePromptPackage(
      "I want to build a task management web app.",
      mockAnalysis,
      "generic"
    );

    expect(result.finalPrompt).toBeTruthy();
    expect(result.templateUsed).toBe("generic-initial-v1");
  });

  it("includes user context when provided", () => {
    const result = generatePromptPackage(
      "Build an app",
      mockAnalysis,
      "claude",
      "Using React and TypeScript"
    );

    expect(result.finalPrompt).toContain("Using React and TypeScript");
  });

  it("includes missing information warnings", () => {
    const result = generatePromptPackage(
      "Build an app",
      mockAnalysis,
      "claude"
    );

    expect(result.finalPrompt).toContain("Preferred database");
    expect(result.finalPrompt).toContain("Authentication requirements");
  });

  it("includes risks and warnings", () => {
    const result = generatePromptPackage(
      "Build an app",
      mockAnalysis,
      "claude"
    );

    expect(result.finalPrompt).toContain("Scope may expand");
  });
});
