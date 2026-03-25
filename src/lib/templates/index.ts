import type { AnalysisResult } from "@/lib/schemas";

export type TemplateType =
  | "initial"
  | "withAttachments"
  | "research"
  | "continuation"
  | "revision";

export type Platform = "chatgpt" | "claude" | "gemini" | "generic";

interface PromptContext {
  // transcript is accepted for API compatibility but NOT used in the output.
  // The final prompt is built exclusively from the structured analysis blueprint.
  transcript: string;
  analysis: AnalysisResult;
  userContext?: string;
  parentContext?: string;
  continuationNotes?: string;
}

// ── Language-aware labels ─────────────────────────────────────────────────────

interface Labels {
  role: string;
  objective: string;
  context: string;
  deliverables: string;
  constraints: string;
  approach: string;
  outputFormat: string;
  notes: string;
  continuingWork: string;
  revisionRequest: string;
  whatToKeep: string;
  whatToChange: string;
  assumptionNeeded: string;
}

function getLabels(lang: string): Labels {
  if (lang === "es") {
    return {
      role: "Rol",
      objective: "Objetivo",
      context: "Contexto",
      deliverables: "Entregables",
      constraints: "Restricciones y Reglas",
      approach: "Enfoque de Trabajo",
      outputFormat: "Formato de Salida",
      notes: "Notas Importantes",
      continuingWork: "Continuando trabajo anterior",
      revisionRequest: "Solicitud de revisión",
      whatToKeep: "Qué debe mantenerse igual",
      whatToChange: "Qué debe cambiar",
      assumptionNeeded: "Asumir si no se especifica",
    };
  }
  if (lang === "pt") {
    return {
      role: "Papel",
      objective: "Objetivo",
      context: "Contexto",
      deliverables: "Entregas",
      constraints: "Restrições e Regras",
      approach: "Abordagem",
      outputFormat: "Formato de Saída",
      notes: "Notas Importantes",
      continuingWork: "Continuando trabalho anterior",
      revisionRequest: "Solicitação de revisão",
      whatToKeep: "O que deve permanecer igual",
      whatToChange: "O que deve mudar",
      assumptionNeeded: "Assumir se não especificado",
    };
  }
  // Default: English
  return {
    role: "Role",
    objective: "Objective",
    context: "Context",
    deliverables: "Deliverables",
    constraints: "Constraints & Rules",
    approach: "Approach",
    outputFormat: "Output Format",
    notes: "Important Notes",
    continuingWork: "Continuing previous work on",
    revisionRequest: "Revision request for",
    whatToKeep: "What should stay the same",
    whatToChange: "What should change",
    assumptionNeeded: "Assume if not specified",
  };
}

// ── Role mapping ──────────────────────────────────────────────────────────────

const ROLE_MAP: Record<string, string> = {
  coding: "an expert senior software engineer with deep knowledge of modern best practices, architecture patterns, and production-grade development",
  research: "a thorough research analyst with expertise in synthesizing information, evaluating sources, and producing actionable insights",
  writing: "a skilled professional writer capable of producing polished, engaging, and audience-appropriate content",
  strategy: "a seasoned strategic advisor with experience in business analysis, decision-making frameworks, and organizational planning",
  operations: "an experienced operations specialist focused on process efficiency, clarity, and practical execution",
  analysis: "a meticulous analyst with expertise in structured reasoning, data interpretation, and evidence-based conclusions",
  design: "a creative design professional with strong product thinking and user-centered design principles",
  automation: "an automation and workflow engineering expert with mastery of modern tooling and system integration patterns",
  document_editing: "a precise document editor and content strategist with expert command of structure, clarity, and professional tone",
  planning: "a strategic project planner experienced in breaking down complex goals into actionable, phased execution plans",
  continuation: "an AI assistant with full context of the prior conversation, continuing the work with consistency",
  review_changes: "a detail-oriented reviewer focused on identifying improvements while preserving the intent and quality of the original work",
};

function getRoleStatement(analysis: AnalysisResult): string {
  return ROLE_MAP[analysis.taskType] ?? "an experienced professional with deep expertise in this domain";
}

// ── Output format helpers ─────────────────────────────────────────────────────

function getOutputInstruction(analysis: AnalysisResult): string {
  if (analysis.preferredOutputFormat) return analysis.preferredOutputFormat;

  const { taskType, complexityScore } = analysis;
  if (taskType === "coding") {
    return complexityScore >= 4
      ? "Provide complete, production-ready code with error handling, tests where appropriate, and inline documentation. Organize output into clearly labeled sections per component or module."
      : "Provide clean, working code with brief inline comments for non-obvious logic. Include a short usage example.";
  }
  if (taskType === "writing") return "Deliver polished, publication-ready prose with clear structure, appropriate headers, and consistent tone throughout.";
  if (taskType === "research") return "Present findings as a structured report: executive summary, key findings with supporting evidence, and actionable recommendations.";
  if (taskType === "analysis") return "Structure the output with: framing, methodology, findings, and conclusions. Support claims with reasoning and evidence.";
  if (taskType === "strategy") return "Deliver a strategic plan covering: situation, options considered, recommended approach, implementation steps, and success metrics.";
  if (taskType === "planning") return "Produce a phased plan with clear milestones, dependencies, and success criteria for each phase.";
  if (complexityScore >= 4) return "Structure the response with clear sections and headers. For multi-part deliverables, break work into phases with explicit milestones.";
  return "Provide a clear, well-organized response. Use headers and lists where they improve readability.";
}

// ── Constraint block builder ──────────────────────────────────────────────────

function getConstraintLines(analysis: AnalysisResult, L: Labels): string[] {
  const lines: string[] = [];
  if (analysis.keyConstraints?.length) {
    lines.push(...analysis.keyConstraints.map((c) => `- ${c}`));
  }
  if (analysis.executionRules?.length) {
    lines.push(...analysis.executionRules.map((r) => `- ${r}`));
  }
  if (analysis.missingInformation?.length) {
    lines.push(...analysis.missingInformation.map((m) => `- ${L.assumptionNeeded}: ${m}`));
  }
  return lines;
}

// ── Capability requirement lines ──────────────────────────────────────────────

function getCapabilityLines(analysis: AnalysisResult): string[] {
  const lines: string[] = [];
  if (analysis.requiredCapabilities?.needsWebResearch) {
    lines.push("- Research and incorporate current information from the web where relevant");
  }
  if (analysis.requiredCapabilities?.needsCodeEnvironment) {
    lines.push("- Produce executable, tested code with proper error handling");
  }
  if (analysis.requiredCapabilities?.needsLongContextModel) {
    lines.push("- Handle large volumes of context carefully and completely");
  }
  return lines;
}

// ── Platform renderers ────────────────────────────────────────────────────────

function renderClaude(ctx: PromptContext): string {
  const { analysis } = ctx;
  const L = getLabels(analysis.outputLanguage ?? "en");
  const sections: string[] = [];

  // Role — short and direct
  sections.push(`## ${L.role}\n\nYou are ${getRoleStatement(analysis)}.`);

  // Objective — the distilled intent, never raw transcript
  const objective = analysis.distilledObjective?.trim() || analysis.title;
  sections.push(`## ${L.objective}\n\n${objective}`);

  // Context — only if present
  const ctxParts = [ctx.userContext, ctx.parentContext].filter(Boolean);
  if (ctxParts.length > 0) {
    sections.push(`## ${L.context}\n\n${ctxParts.join("\n\n")}`);
  }

  // Deliverables — structured list
  if (analysis.deliverables?.length) {
    const list = analysis.deliverables.map((d, i) => `${i + 1}. ${d}`).join("\n");
    sections.push(`## ${L.deliverables}\n\n${list}`);
  }

  // Constraints, rules, missing-info assumptions
  const constraintLines = [
    ...getConstraintLines(analysis, L),
    ...getCapabilityLines(analysis),
  ];
  if (constraintLines.length > 0) {
    sections.push(`## ${L.constraints}\n\n${constraintLines.join("\n")}`);
  }

  // Approach
  if (analysis.suggestedMethodology?.trim()) {
    sections.push(`## ${L.approach}\n\n${analysis.suggestedMethodology}`);
  }

  // Output format
  sections.push(`## ${L.outputFormat}\n\n${getOutputInstruction(analysis)}`);

  // Warnings
  if (analysis.risksOrWarnings?.length) {
    const warnings = analysis.risksOrWarnings.map((w) => `- ${w}`).join("\n");
    sections.push(`## ${L.notes}\n\n${warnings}`);
  }

  return sections.join("\n\n---\n\n");
}

function renderChatGPT(ctx: PromptContext): string {
  const { analysis } = ctx;
  const L = getLabels(analysis.outputLanguage ?? "en");
  const sections: string[] = [];

  sections.push(`**${L.role}**: You are ${getRoleStatement(analysis)}.`);

  const objective = analysis.distilledObjective?.trim() || analysis.title;
  sections.push(`**${L.objective}**:\n${objective}`);

  const ctxParts = [ctx.userContext, ctx.parentContext].filter(Boolean);
  if (ctxParts.length > 0) {
    sections.push(`**${L.context}**:\n${ctxParts.join("\n\n")}`);
  }

  if (analysis.deliverables?.length) {
    const list = analysis.deliverables.map((d, i) => `${i + 1}. ${d}`).join("\n");
    sections.push(`**${L.deliverables}**:\n${list}`);
  }

  const constraintLines = [
    ...getConstraintLines(analysis, L),
    ...getCapabilityLines(analysis),
  ];
  if (constraintLines.length > 0) {
    sections.push(`**${L.constraints}**:\n${constraintLines.join("\n")}`);
  }

  if (analysis.suggestedMethodology?.trim()) {
    sections.push(`**${L.approach}**: ${analysis.suggestedMethodology}`);
  }

  sections.push(`**${L.outputFormat}**: ${getOutputInstruction(analysis)}`);

  if (analysis.risksOrWarnings?.length) {
    sections.push(
      `**${L.notes}**:\n${analysis.risksOrWarnings.map((w) => `- ${w}`).join("\n")}`
    );
  }

  return sections.join("\n\n");
}

function renderGemini(ctx: PromptContext): string {
  const { analysis } = ctx;
  const L = getLabels(analysis.outputLanguage ?? "en");
  const sections: string[] = [];

  const objective = analysis.distilledObjective?.trim() || analysis.title;
  sections.push(objective);

  const ctxParts = [ctx.userContext, ctx.parentContext].filter(Boolean);
  if (ctxParts.length > 0) {
    sections.push(`**${L.context}**: ${ctxParts.join(" | ")}`);
  }

  if (analysis.deliverables?.length) {
    const list = analysis.deliverables.map((d, i) => `${i + 1}. ${d}`).join("\n");
    sections.push(`**${L.deliverables}**:\n${list}`);
  }

  const constraintLines = getConstraintLines(analysis, L);
  if (constraintLines.length > 0) {
    sections.push(`**${L.constraints}**:\n${constraintLines.join("\n")}`);
  }

  sections.push(`**${L.outputFormat}**: ${getOutputInstruction(analysis)}`);

  if (analysis.risksOrWarnings?.length) {
    sections.push(
      `**${L.notes}**:\n${analysis.risksOrWarnings.map((w) => `- ${w}`).join("\n")}`
    );
  }

  return sections.join("\n\n");
}

function renderGeneric(ctx: PromptContext): string {
  const { analysis } = ctx;
  const L = getLabels(analysis.outputLanguage ?? "en");
  const sections: string[] = [];

  sections.push(`${L.role}: You are ${getRoleStatement(analysis)}.`);

  const objective = analysis.distilledObjective?.trim() || analysis.title;
  sections.push(`${L.objective}: ${objective}`);

  const ctxParts = [ctx.userContext, ctx.parentContext].filter(Boolean);
  if (ctxParts.length > 0) {
    sections.push(`${L.context}:\n${ctxParts.join("\n\n")}`);
  }

  if (analysis.deliverables?.length) {
    const list = analysis.deliverables.map((d, i) => `${i + 1}. ${d}`).join("\n");
    sections.push(`${L.deliverables}:\n${list}`);
  }

  const constraintLines = [
    ...getConstraintLines(analysis, L),
    ...getCapabilityLines(analysis),
  ];
  if (constraintLines.length > 0) {
    sections.push(`${L.constraints}:\n${constraintLines.join("\n")}`);
  }

  if (analysis.suggestedMethodology?.trim()) {
    sections.push(`${L.approach}: ${analysis.suggestedMethodology}`);
  }

  sections.push(`${L.outputFormat}: ${getOutputInstruction(analysis)}`);

  if (analysis.risksOrWarnings?.length) {
    sections.push(
      `${L.notes}:\n${analysis.risksOrWarnings.map((w) => `- ${w}`).join("\n")}`
    );
  }

  return sections.join("\n\n");
}

// ── Main generators ───────────────────────────────────────────────────────────

export function generateInitialPrompt(ctx: PromptContext, platform: Platform): string {
  switch (platform) {
    case "claude":  return renderClaude(ctx);
    case "chatgpt": return renderChatGPT(ctx);
    case "gemini":  return renderGemini(ctx);
    case "generic": return renderGeneric(ctx);
  }
}

export function generateFollowUpPrompt(ctx: PromptContext, platform: Platform): string {
  const { analysis } = ctx;
  const L = getLabels(analysis.outputLanguage ?? "en");
  const objective = analysis.distilledObjective?.trim() || analysis.title;

  if (platform === "claude") {
    const parts = [
      `## ${L.continuingWork}: ${analysis.title}\n\n${objective}`,
    ];
    if (ctx.continuationNotes?.trim()) {
      parts.push(`**Update since last interaction:**\n${ctx.continuationNotes.trim()}`);
    } else {
      parts.push("**Update since last interaction:**\n[Describe what happened and what you need next]");
    }
    parts.push("Pick up exactly where we left off, maintaining full consistency with the prior output's style, decisions, and direction.");
    return parts.join("\n\n");
  }

  const header = `**${L.continuingWork}**: ${analysis.title}`;
  const body = ctx.continuationNotes?.trim()
    ? `Update and continuation request:\n${ctx.continuationNotes.trim()}`
    : "Update and continuation request:\n[Describe what happened and what you need to continue]";
  const closing = "Continue from where we left off, maintaining consistency with prior output.";

  return [header, body, closing].join("\n\n");
}

export function generateRevisionPrompt(ctx: PromptContext, platform: Platform): string {
  const { analysis } = ctx;
  const L = getLabels(analysis.outputLanguage ?? "en");

  if (platform === "claude") {
    return [
      `## ${L.revisionRequest}: ${analysis.title}`,
      `**${L.whatToChange}:**\n[Describe the specific modifications needed]`,
      `**${L.whatToKeep}:**\nPreserve the overall structure, tone, and direction established in the previous output unless specifically asked to change it.`,
    ].join("\n\n");
  }

  return [
    `**${L.revisionRequest}**: ${analysis.title}`,
    `**${L.whatToChange}**: [Describe specific modifications needed]`,
    `**${L.whatToKeep}**: Keep the overall structure, tone, and approach unless specifically asked to change it.`,
  ].join("\n\n");
}

export function generatePromptPackage(
  _transcript: string, // Accepted for API compatibility. NOT used in prompt output.
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
    transcript: _transcript,
    analysis,
    userContext,
    parentContext,
    continuationNotes,
  };

  return {
    finalPrompt: generateInitialPrompt(ctx, platform),
    followUpPrompt: generateFollowUpPrompt(ctx, platform),
    revisionPrompt: generateRevisionPrompt(ctx, platform),
    templateUsed: `${platform}-v2`,
  };
}
