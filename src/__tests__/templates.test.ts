import { describe, it, expect } from "vitest";
import { generatePromptPackage } from "@/lib/templates";
import type { AnalysisResult } from "@/lib/schemas";

// Full mock including new blueprint fields
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
  // ── New blueprint fields ──
  distilledObjective:
    "Design and implement a full-stack task management web application with drag-and-drop task reordering. The application must support task creation, editing, status tracking, and persistent storage.",
  deliverables: [
    "Working task management application",
    "Drag-and-drop UI with React",
    "REST API with CRUD operations",
    "Persistent data storage layer",
  ],
  keyConstraints: ["Use React for the frontend", "Expose a REST API"],
  executionRules: ["Implement data layer before UI", "Include error handling on all API routes"],
  outputLanguage: "en",
  preferredOutputFormat: null,
};

const mockAnalysisSpanish: AnalysisResult = {
  ...mockAnalysis,
  title: "Construir una app de gestión de tareas",
  distilledObjective:
    "Diseñar e implementar una aplicación web de gestión de tareas con soporte para arrastrar y soltar. La aplicación debe permitir crear, editar y rastrear tareas con almacenamiento persistente.",
  deliverables: [
    "Aplicación web de gestión de tareas funcional",
    "Interfaz drag-and-drop con React",
    "API REST con operaciones CRUD",
  ],
  keyConstraints: ["Usar React en el frontend", "Exponer una API REST"],
  executionRules: ["Implementar la capa de datos antes de la UI"],
  outputLanguage: "es",
};

// ── Structure tests ───────────────────────────────────────────────────────────

describe("Claude platform rendering", () => {
  it("uses ## Markdown headers for clean structure", () => {
    const result = generatePromptPackage("ignored transcript", mockAnalysis, "claude");
    expect(result.finalPrompt).toContain("## Role");
    expect(result.finalPrompt).toContain("## Objective");
    expect(result.finalPrompt).toContain("## Deliverables");
    expect(result.finalPrompt).toContain("## Approach");
    expect(result.finalPrompt).toContain("## Output Format");
  });

  it("does NOT use legacy XML tags for the main task", () => {
    const result = generatePromptPackage("ignored", mockAnalysis, "claude");
    expect(result.finalPrompt).not.toContain("<task>");
    expect(result.finalPrompt).not.toContain("</task>");
  });

  it("uses distilledObjective as the task body, not the transcript", () => {
    const result = generatePromptPackage("ignored raw transcript text", mockAnalysis, "claude");
    expect(result.finalPrompt).toContain("drag-and-drop task reordering");
    expect(result.finalPrompt).not.toContain("ignored raw transcript text");
  });

  it("includes deliverables list", () => {
    const result = generatePromptPackage("", mockAnalysis, "claude");
    expect(result.finalPrompt).toContain("Working task management application");
    expect(result.finalPrompt).toContain("Drag-and-drop UI with React");
  });

  it("templateUsed is v2", () => {
    const result = generatePromptPackage("", mockAnalysis, "claude");
    expect(result.templateUsed).toBe("claude-v2");
  });
});

describe("ChatGPT platform rendering", () => {
  it("uses **Bold** instruction hierarchy", () => {
    const result = generatePromptPackage("", mockAnalysis, "chatgpt");
    expect(result.finalPrompt).toContain("**Role**");
    expect(result.finalPrompt).toContain("**Objective**");
    expect(result.finalPrompt).not.toContain("## Role");
  });

  it("does not use XML tags", () => {
    const result = generatePromptPackage("", mockAnalysis, "chatgpt");
    expect(result.finalPrompt).not.toContain("<task>");
    expect(result.finalPrompt).not.toContain("**Task**");
  });

  it("templateUsed is v2", () => {
    const result = generatePromptPackage("", mockAnalysis, "chatgpt");
    expect(result.templateUsed).toBe("chatgpt-v2");
  });
});

describe("Gemini platform rendering", () => {
  it("starts with the objective directly", () => {
    const result = generatePromptPackage("", mockAnalysis, "gemini");
    // Gemini format starts with the objective text directly (no headers)
    expect(result.finalPrompt.trim()).toMatch(/^Design and implement/);
  });

  it("produces a non-empty result", () => {
    const result = generatePromptPackage("", mockAnalysis, "gemini");
    expect(result.finalPrompt.length).toBeGreaterThan(50);
  });
});

describe("Generic platform rendering", () => {
  it("uses plain label: format", () => {
    const result = generatePromptPackage("", mockAnalysis, "generic");
    expect(result.finalPrompt).toContain("Role:");
    expect(result.finalPrompt).toContain("Objective:");
    expect(result.finalPrompt).not.toContain("**Role**");
    expect(result.finalPrompt).not.toContain("## Role");
  });

  it("templateUsed is v2", () => {
    const result = generatePromptPackage("", mockAnalysis, "generic");
    expect(result.templateUsed).toBe("generic-v2");
  });
});

// ── No transcript leakage ─────────────────────────────────────────────────────

describe("Transcript isolation", () => {
  it("does not copy raw transcript text into the final prompt", () => {
    const oralTranscript =
      "So, um, basically what I, uh, I need is like, you know, a task management app. " +
      "Basically, I want users to be able to like drag and drop stuff.";
    const result = generatePromptPackage(oralTranscript, mockAnalysis, "claude");

    // Oral noise must NOT appear
    expect(result.finalPrompt).not.toContain("um,");
    expect(result.finalPrompt).not.toContain("uh,");
    expect(result.finalPrompt).not.toContain("you know");
    expect(result.finalPrompt).not.toContain("basically what I");
    expect(result.finalPrompt).not.toContain("like, you know");
    // Raw transcript block must NOT appear
    expect(result.finalPrompt).not.toContain(oralTranscript);
  });

  it("final prompt is not just a rephrased transcript", () => {
    const result = generatePromptPackage("some transcript", mockAnalysis, "claude");
    // Uses distilled content, not transcript
    expect(result.finalPrompt).toContain("drag-and-drop task reordering");
    expect(result.finalPrompt).not.toContain("some transcript");
  });
});

// ── Language consistency ──────────────────────────────────────────────────────

describe("Language handling", () => {
  it("uses Spanish section labels when outputLanguage is 'es'", () => {
    const result = generatePromptPackage("", mockAnalysisSpanish, "claude");
    expect(result.finalPrompt).toContain("## Objetivo");
    expect(result.finalPrompt).toContain("## Rol");
    expect(result.finalPrompt).not.toContain("## Objective");
  });

  it("ChatGPT also respects outputLanguage", () => {
    const result = generatePromptPackage("", mockAnalysisSpanish, "chatgpt");
    expect(result.finalPrompt).toContain("**Objetivo**");
    expect(result.finalPrompt).not.toContain("**Objective**");
  });

  it("uses English labels when outputLanguage is 'en'", () => {
    const result = generatePromptPackage("", mockAnalysis, "claude");
    expect(result.finalPrompt).toContain("## Objective");
    expect(result.finalPrompt).not.toContain("## Objetivo");
  });
});

// ── Context inclusion ─────────────────────────────────────────────────────────

describe("Context handling", () => {
  it("includes user context when provided", () => {
    const result = generatePromptPackage("", mockAnalysis, "claude", "Using React and TypeScript");
    expect(result.finalPrompt).toContain("Using React and TypeScript");
  });

  it("omits context section when not provided", () => {
    const result = generatePromptPackage("", mockAnalysis, "claude");
    expect(result.finalPrompt).not.toContain("## Context");
  });
});

// ── Constraints and warnings ──────────────────────────────────────────────────

describe("Constraints and warnings", () => {
  it("includes missing information as assumptions", () => {
    const result = generatePromptPackage("", mockAnalysis, "claude");
    expect(result.finalPrompt).toContain("Preferred database");
    expect(result.finalPrompt).toContain("Authentication requirements");
  });

  it("includes risks and warnings section", () => {
    const result = generatePromptPackage("", mockAnalysis, "claude");
    expect(result.finalPrompt).toContain("Scope may expand");
  });

  it("includes key constraints", () => {
    const result = generatePromptPackage("", mockAnalysis, "claude");
    expect(result.finalPrompt).toContain("Use React for the frontend");
  });
});

// ── Continuation and revision prompts ────────────────────────────────────────

describe("Follow-up and revision prompts", () => {
  it("follow-up references the task title, not raw transcript", () => {
    const result = generatePromptPackage("raw noisy transcript um uh", mockAnalysis, "claude");
    expect(result.followUpPrompt).toContain("Build a task management web app");
    expect(result.followUpPrompt).not.toContain("um uh");
    expect(result.followUpPrompt).not.toContain("raw noisy transcript");
  });

  it("revision prompt references the task title", () => {
    const result = generatePromptPackage("", mockAnalysis, "claude");
    expect(result.revisionPrompt).toContain("Build a task management web app");
  });

  it("follow-up for ChatGPT does not use ## headers", () => {
    const result = generatePromptPackage("", mockAnalysis, "chatgpt");
    expect(result.followUpPrompt).not.toContain("## Continuing");
    expect(result.followUpPrompt).toContain("**Continuing");
  });
});

// ── Output quality ────────────────────────────────────────────────────────────

describe("Output quality", () => {
  it("final prompt is substantially longer than just the title", () => {
    const result = generatePromptPackage("", mockAnalysis, "claude");
    expect(result.finalPrompt.length).toBeGreaterThan(300);
  });

  it("final prompt does not contain raw filler noise from a long transcript", () => {
    const longTranscript = "um ".repeat(200) + "build a task app";
    const result = generatePromptPackage(longTranscript, mockAnalysis, "claude");
    // The transcript must not appear verbatim in the output
    expect(result.finalPrompt).not.toContain(longTranscript);
    // Oral filler noise must be absent
    expect(result.finalPrompt).not.toMatch(/\bum\b.*\bum\b/);
  });

  it("all three prompt variants are non-empty", () => {
    const result = generatePromptPackage("", mockAnalysis, "claude");
    expect(result.finalPrompt.trim()).toBeTruthy();
    expect(result.followUpPrompt.trim()).toBeTruthy();
    expect(result.revisionPrompt.trim()).toBeTruthy();
  });
});
