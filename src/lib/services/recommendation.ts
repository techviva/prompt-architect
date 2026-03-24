import type { AnalysisResult } from "@/lib/schemas";
import type { Platform } from "@/lib/templates";

interface Recommendation {
  platform: Platform;
  model: string;
  methodology: string;
}

// Deterministic rules engine for platform recommendation
const PLATFORM_RULES: Array<{
  condition: (a: AnalysisResult) => boolean;
  platform: Platform;
  model: string;
  reason: string;
}> = [
  {
    condition: (a) =>
      a.taskType === "coding" && a.complexityScore >= 3,
    platform: "claude",
    model: "claude-sonnet-4-20250514",
    reason: "Complex coding tasks benefit from Claude's code capabilities",
  },
  {
    condition: (a) => a.taskType === "coding",
    platform: "claude",
    model: "claude-sonnet-4-20250514",
    reason: "Claude excels at code generation and analysis",
  },
  {
    condition: (a) =>
      a.taskType === "research" &&
      a.requiredCapabilities.needsWebResearch,
    platform: "gemini",
    model: "gemini-2.0-flash",
    reason: "Gemini provides grounded search capabilities",
  },
  {
    condition: (a) =>
      a.taskType === "research" &&
      a.requiredCapabilities.needsDeepResearch,
    platform: "chatgpt",
    model: "gpt-4o",
    reason: "ChatGPT's deep research mode suits comprehensive research",
  },
  {
    condition: (a) =>
      a.taskType === "writing" && a.complexityScore >= 4,
    platform: "claude",
    model: "claude-sonnet-4-20250514",
    reason: "Claude handles long-form writing with nuance",
  },
  {
    condition: (a) => a.taskType === "writing",
    platform: "chatgpt",
    model: "gpt-4o",
    reason: "ChatGPT is versatile for general writing tasks",
  },
  {
    condition: (a) =>
      a.taskType === "analysis" &&
      a.requiredCapabilities.needsLongContextModel,
    platform: "claude",
    model: "claude-sonnet-4-20250514",
    reason: "Claude's large context window suits heavy analysis",
  },
  {
    condition: (a) => a.taskType === "design",
    platform: "chatgpt",
    model: "gpt-4o",
    reason: "ChatGPT integrates image generation for design work",
  },
  {
    condition: (a) =>
      a.taskType === "automation" || a.taskType === "operations",
    platform: "claude",
    model: "claude-sonnet-4-20250514",
    reason: "Claude excels at systematic, structured output",
  },
  {
    condition: (a) => a.taskType === "strategy" || a.taskType === "planning",
    platform: "chatgpt",
    model: "gpt-4o",
    reason: "ChatGPT provides broad strategic perspectives",
  },
  {
    condition: (a) =>
      a.taskType === "document_editing" &&
      a.requiredCapabilities.needsCanvasLikeEditor,
    platform: "chatgpt",
    model: "gpt-4o",
    reason: "ChatGPT Canvas is ideal for document editing",
  },
];

export function getRecommendation(analysis: AnalysisResult): Recommendation {
  // First check Gemini's own suggestion
  const geminiSuggestion: Recommendation = {
    platform: analysis.suggestedPlatform as Platform,
    model: analysis.suggestedModel,
    methodology: analysis.suggestedMethodology,
  };

  // Apply deterministic rules — find first matching rule
  for (const rule of PLATFORM_RULES) {
    if (rule.condition(analysis)) {
      return {
        platform: rule.platform,
        model: rule.model,
        methodology: analysis.suggestedMethodology,
      };
    }
  }

  // Fallback to Gemini's suggestion
  return geminiSuggestion;
}

export function resolveTargetPlatform(
  userChoice: string,
  recommendation: Recommendation
): Platform {
  if (userChoice && userChoice !== "auto") {
    return userChoice as Platform;
  }
  return recommendation.platform;
}
