import type { AnalysisResult } from "@/lib/schemas";

export type TemplateType =
  | "initial"
  | "withAttachments"
  | "research"
  | "continuation"
  | "revision";

export type Platform = "chatgpt" | "claude" | "gemini" | "generic";

interface PromptContext {
  transcript: string;
  analysis: AnalysisResult;
  userContext?: string;
  parentContext?: string;
  continuationNotes?: string;
}

// ── Platform-specific formatters ──

function formatClaude(sections: string[]): string {
  return sections.filter(Boolean).join("\n\n");
}

function formatChatGPT(sections: string[]): string {
  return sections.filter(Boolean).join("\n\n");
}

function formatGemini(sections: string[]): string {
  return sections.filter(Boolean).join("\n\n");
}

function formatGeneric(sections: string[]): string {
  return sections.filter(Boolean).join("\n\n");
}

// ── Section builders ──

function buildRoleSection(analysis: AnalysisResult, platform: Platform): string {
  const roleMap: Record<string, string> = {
    coding: "an expert senior software engineer",
    research: "a thorough research analyst",
    writing: "a skilled professional writer",
    strategy: "a seasoned strategic advisor",
    operations: "an experienced operations specialist",
    analysis: "a meticulous data analyst",
    design: "a creative design professional",
    automation: "an automation and workflow expert",
    document_editing: "a precise document editor and proofreader",
    planning: "a strategic project planner",
    continuation: "an AI assistant continuing prior work",
    review_changes: "a detail-oriented reviewer",
  };
  const role = roleMap[analysis.taskType] ?? "an experienced professional";

  if (platform === "claude") {
    return `<role>Act as ${role}. Apply your expertise to deliver high-quality, well-reasoned output.</role>`;
  }
  return `**Role**: Act as ${role}. Apply your expertise to deliver high-quality, well-reasoned output.`;
}

function buildContextSection(ctx: PromptContext, platform: Platform): string {
  const parts: string[] = [];
  if (ctx.userContext) {
    parts.push(`Additional context: ${ctx.userContext}`);
  }
  if (ctx.parentContext) {
    parts.push(`Previous work context: ${ctx.parentContext}`);
  }
  if (parts.length === 0) return "";

  if (platform === "claude") {
    return `<context>\n${parts.join("\n\n")}\n</context>`;
  }
  return `**Context**:\n${parts.join("\n\n")}`;
}

function buildTaskSection(ctx: PromptContext, platform: Platform): string {
  if (platform === "claude") {
    return `<task>\n${ctx.transcript}\n</task>`;
  }
  return `**Task**:\n${ctx.transcript}`;
}

function buildRequirementsSection(analysis: AnalysisResult, platform: Platform): string {
  const reqs: string[] = [];
  if (analysis.requiredCapabilities.needsWebResearch) {
    reqs.push("Research current information from the web when relevant");
  }
  if (analysis.requiredCapabilities.needsCodeEnvironment) {
    reqs.push("Write executable, tested code with proper error handling");
  }
  if (analysis.requiredCapabilities.needsLongContextModel) {
    reqs.push("Handle and process large amounts of context carefully");
  }

  if (analysis.missingInformation.length > 0) {
    reqs.push(
      `Note: The following information may be needed but was not provided — make reasonable assumptions and flag them:\n${analysis.missingInformation.map((i) => `- ${i}`).join("\n")}`
    );
  }

  if (reqs.length === 0) return "";

  if (platform === "claude") {
    return `<requirements>\n${reqs.join("\n\n")}\n</requirements>`;
  }
  return `**Requirements**:\n${reqs.join("\n\n")}`;
}

function buildMethodologySection(analysis: AnalysisResult, platform: Platform): string {
  if (platform === "claude") {
    return `<methodology>\n${analysis.suggestedMethodology}\n</methodology>`;
  }
  return `**Approach**:\n${analysis.suggestedMethodology}`;
}

function buildOutputSection(analysis: AnalysisResult, platform: Platform): string {
  const format =
    analysis.complexityScore >= 4
      ? "Structure your response with clear sections, headers, and numbered steps where appropriate. For complex deliverables, break the work into phases."
      : "Provide a clear, well-organized response. Use headers and lists where they aid readability.";

  if (platform === "claude") {
    return `<output_format>\n${format}\n</output_format>`;
  }
  return `**Output Format**:\n${format}`;
}

function buildWarningsSection(analysis: AnalysisResult, platform: Platform): string {
  if (analysis.risksOrWarnings.length === 0) return "";

  const warnings = analysis.risksOrWarnings.map((w) => `- ${w}`).join("\n");
  if (platform === "claude") {
    return `<important_notes>\n${warnings}\n</important_notes>`;
  }
  return `**Important Notes**:\n${warnings}`;
}

// ── Main generators ──

export function generateInitialPrompt(ctx: PromptContext, platform: Platform): string {
  const sections = [
    buildRoleSection(ctx.analysis, platform),
    buildContextSection(ctx, platform),
    buildTaskSection(ctx, platform),
    buildRequirementsSection(ctx.analysis, platform),
    buildMethodologySection(ctx.analysis, platform),
    buildOutputSection(ctx.analysis, platform),
    buildWarningsSection(ctx.analysis, platform),
  ];

  const formatters: Record<Platform, (s: string[]) => string> = {
    claude: formatClaude,
    chatgpt: formatChatGPT,
    gemini: formatGemini,
    generic: formatGeneric,
  };

  return formatters[platform](sections);
}

export function generateFollowUpPrompt(
  ctx: PromptContext,
  platform: Platform
): string {
  const intro =
    platform === "claude"
      ? `<context>This continues a previous conversation about: "${ctx.analysis.title}"</context>`
      : `**Continuing previous work on**: "${ctx.analysis.title}"`;

  const body = ctx.continuationNotes
    ? `Here's what happened since our last interaction and what I need next:\n\n${ctx.continuationNotes}`
    : `I'd like to continue working on this. Here's what I need next:\n\n[Describe what happened and what you need to continue with]`;

  const closing =
    "Please pick up from where we left off, maintaining consistency with the previous output's style and approach.";

  return [intro, body, closing].join("\n\n");
}

export function generateRevisionPrompt(
  ctx: PromptContext,
  platform: Platform
): string {
  const intro =
    platform === "claude"
      ? `<context>This is a revision request for: "${ctx.analysis.title}"</context>`
      : `**Revision request for**: "${ctx.analysis.title}"`;

  const body = `I need changes to the previous output. Here's what needs to be modified:

[Describe specific changes needed]

**What should stay the same**: Keep the overall structure, tone, and approach unless specifically asked to change it.

**What should change**: Focus only on the specific modifications requested above.`;

  return [intro, body].join("\n\n");
}

export function generatePromptPackage(
  transcript: string,
  analysis: AnalysisResult,
  platform: Platform,
  userContext?: string,
  parentContext?: string,
  continuationNotes?: string
): {
  finalPrompt: string;
  followUpPrompt: string;
  revisionPrompt: string;
  templateUsed: string;
} {
  const ctx: PromptContext = {
    transcript,
    analysis,
    userContext,
    parentContext,
    continuationNotes,
  };

  return {
    finalPrompt: generateInitialPrompt(ctx, platform),
    followUpPrompt: generateFollowUpPrompt(ctx, platform),
    revisionPrompt: generateRevisionPrompt(ctx, platform),
    templateUsed: `${platform}-initial-v1`,
  };
}
