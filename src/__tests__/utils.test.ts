import { describe, it, expect } from "vitest";
import {
  formatFileSize,
  getStatusColor,
  getStatusLabel,
  getComplexityColor,
  getPlatformLabel,
  getTaskTypeLabel,
} from "@/lib/utils";

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(500)).toBe("500.0 B");
  });

  it("formats KB", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("formats MB", () => {
    expect(formatFileSize(1048576)).toBe("1.0 MB");
    expect(formatFileSize(52428800)).toBe("50.0 MB");
  });
});

describe("getStatusColor", () => {
  it("returns correct colors for known statuses", () => {
    expect(getStatusColor("completed")).toContain("green");
    expect(getStatusColor("failed")).toContain("red");
    expect(getStatusColor("queued")).toContain("blue");
  });

  it("returns default for unknown status", () => {
    expect(getStatusColor("unknown")).toContain("gray");
  });
});

describe("getStatusLabel", () => {
  it("returns human-readable labels", () => {
    expect(getStatusLabel("generating_prompt")).toBe("Generating Prompt");
    expect(getStatusLabel("completed")).toBe("Completed");
  });
});

describe("getComplexityColor", () => {
  it("returns appropriate colors", () => {
    expect(getComplexityColor("low")).toContain("green");
    expect(getComplexityColor("very_high")).toContain("red");
  });
});

describe("getPlatformLabel", () => {
  it("returns formatted platform names", () => {
    expect(getPlatformLabel("chatgpt")).toBe("ChatGPT");
    expect(getPlatformLabel("claude")).toBe("Claude");
    expect(getPlatformLabel("auto")).toBe("Auto");
  });
});

describe("getTaskTypeLabel", () => {
  it("formats task types", () => {
    expect(getTaskTypeLabel("document_editing")).toBe("Document Editing");
    expect(getTaskTypeLabel("review_changes")).toBe("Review Changes");
    expect(getTaskTypeLabel("coding")).toBe("Coding");
  });
});
