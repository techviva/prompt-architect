import { GoogleGenAI } from "@google/genai";
import { getEnv } from "@/lib/config/env";
import {
  TranscriptResultSchema,
  AnalysisResultSchema,
  type TranscriptResult,
  type AnalysisResult,
} from "@/lib/schemas";
import { TASK_TYPES, COMPLEXITY_LEVELS } from "@/lib/config/constants";

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (_client) return _client;
  _client = new GoogleGenAI({ apiKey: getEnv().GEMINI_API_KEY });
  return _client;
}

// MIME types that Gemini accepts as inlineData (images + PDF)
const GEMINI_INLINE_MIMETYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

export interface AttachmentForGemini {
  data: Buffer;
  mimeType: string;
  filename: string;
}

const TRANSCRIPTION_PROMPT = `You are an expert audio transcriber. Transcribe the provided audio accurately and completely.

Return a JSON object with exactly these fields:
{
  "rawTranscript": "The complete, verbatim transcription of the audio",
  "cleanedTranscript": "A cleaned version: fix grammar, remove filler words (um, uh, like, you know), fix obvious speech errors, add proper punctuation and paragraphs. Keep the meaning intact.",
  "language": "The detected language (e.g., 'en', 'es', 'fr') or null if unclear",
  "durationProcessed": null
}

Important:
- Transcribe ALL content, do not skip or summarize
- The cleaned version should be readable and well-structured
- Preserve technical terms, names, and specific details exactly
- If the audio contains multiple topics, use paragraph breaks in the cleaned version
- Return ONLY the JSON object, no markdown formatting`;

function buildAnalysisPrompt(
  transcript: string,
  userContext: string,
  attachmentDescriptions: string[]
): string {
  const attachmentSection =
    attachmentDescriptions.length > 0
      ? `\nATTACHED FILES (${attachmentDescriptions.length}):\n${attachmentDescriptions.map((d, i) => `${i + 1}. ${d}`).join("\n")}\n`
      : "";

  return `You are a senior AI workflow architect. Analyze the following user request and produce a structured assessment.

USER'S REQUEST (transcribed from audio):
${transcript}

${userContext ? `ADDITIONAL CONTEXT PROVIDED BY USER:\n${userContext}\n` : ""}${attachmentSection}
Analyze this request and return a JSON object with exactly these fields:

{
  "taskType": one of [${TASK_TYPES.map((t) => `"${t}"`).join(", ")}],
  "taskSubtype": a more specific subtype string or null,
  "complexityScore": integer 1-5 based on these factors:
    - Ambiguity of the request
    - Number of steps required
    - Need for external research
    - Dependency on files/context
    - Depth of reasoning required
    - Risk of error,
  "complexityLevel": one of [${COMPLEXITY_LEVELS.map((l) => `"${l}"`).join(", ")}],
    (1-2 = "low", 3 = "medium", 4 = "high", 5 = "very_high"),
  "complexityDrivers": ["array of strings explaining what makes this complex or simple"],
  "suggestedPlatform": one of ["chatgpt", "claude", "gemini", "generic"],
    Choose based on:
    - "claude": best for coding, long documents, detailed analysis, structured output
    - "chatgpt": best for creative writing, general tasks, web browsing, image generation
    - "gemini": best for research with grounding, multimodal tasks, data analysis
    - "generic": when no platform has a clear advantage,
  "suggestedModel": specific model name (e.g., "claude-sonnet-4-20250514", "gpt-4o", "gemini-2.0-flash"),
  "suggestedMethodology": "A paragraph describing the recommended approach to this task",
  "requiredCapabilities": {
    "needsWebResearch": boolean,
    "needsDeepResearch": boolean,
    "needsAttachments": boolean,
    "needsPriorContext": boolean,
    "needsCodeEnvironment": boolean,
    "needsCanvasLikeEditor": boolean,
    "needsConnectors": boolean,
    "needsLongContextModel": boolean
  },
  "missingInformation": ["array of things the user should clarify or provide"],
  "risksOrWarnings": ["array of potential issues or things to watch out for"],
  "title": "A concise 5-10 word title summarizing this request",
  "distilledObjective": "A 2-4 sentence professional directive stating exactly what the user needs. Transform oral speech into polished written language. Remove ALL hesitations, fillers (um, uh, like, you know, basically), repetitions, self-corrections, and oral artifacts. This statement must be usable directly in a professional AI prompt without any editing. Write it as a clear task statement, not as a description of what the user said.",
  "deliverables": ["List each concrete, specific output the user expects. Be explicit and actionable. E.g. 'Working Next.js app with authentication', 'Technical spec document'. Maximum 6 items."],
  "keyConstraints": ["Explicit constraints or requirements mentioned in the user's request only. Do not invent them. E.g. 'Must use TypeScript', 'Target non-technical users'. Empty array if none stated."],
  "executionRules": ["Specific rules about HOW to do the work, based on what the user described. E.g. 'Explain each step before coding', 'Prioritize mobile UX'. Maximum 4 items. Empty array if none stated."],
  "outputLanguage": "ISO language code of the primary language in the user's request: 'en' English, 'es' Spanish, 'fr' French, 'pt' Portuguese, etc. Match the language the user spoke in.",
  "preferredOutputFormat": "User's preferred output format if stated (e.g. 'step-by-step guide', 'working code with tests', 'executive report'). Return null if not specified."
}

Return ONLY the JSON object, no markdown formatting.`;
}

// ─── Transcript fallback ──────────────────────────────────────────────────────

function buildTranscriptFallback(rawText: string): TranscriptResult {
  // If we got something from the model but it wasn't valid JSON,
  // treat the whole response as the raw transcript.
  return TranscriptResultSchema.parse({
    rawTranscript: rawText || "(no transcript produced)",
    cleanedTranscript: rawText || "(no transcript produced)",
    language: null,
    durationProcessed: null,
  });
}

// ─── Analysis fallback ────────────────────────────────────────────────────────

function buildAnalysisFallback(transcript: string): AnalysisResult {
  return AnalysisResultSchema.parse({
    taskType: "writing",
    taskSubtype: null,
    complexityScore: 3,
    complexityLevel: "medium",
    complexityDrivers: ["Could not parse structured analysis — using safe defaults"],
    suggestedPlatform: "generic",
    suggestedModel: "gpt-4o",
    suggestedMethodology:
      "The analysis could not be fully parsed. Review the transcript and apply your judgment to determine the best approach.",
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
    missingInformation: ["Analysis could not be fully parsed — please review the transcript manually."],
    risksOrWarnings: ["Structured analysis failed; prompt quality may be lower than usual."],
    title: transcript.slice(0, 60).replace(/\n/g, " ").trim() || "Untitled request",
    distilledObjective: transcript.slice(0, 200).replace(/\n/g, " ").trim(),
    deliverables: [],
    keyConstraints: [],
    executionRules: [],
    outputLanguage: "en",
    preferredOutputFormat: null,
  });
}

// ─── JSON extraction ─────────────────────────────────────────────────────────

function extractJson(text: string): string {
  // Try to extract JSON from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // Try to find JSON object directly (greedy — find the outermost braces)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];

  return text.trim();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function transcribeAudio(
  audioData: Buffer,
  mimeType: string
): Promise<TranscriptResult> {
  const client = getClient();
  const base64Audio = audioData.toString("base64");

  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: base64Audio } },
          { text: TRANSCRIPTION_PROMPT },
        ],
      },
    ],
    config: { temperature: 0.1, maxOutputTokens: 8192 },
  });

  const rawText = response.text ?? "";

  try {
    const jsonStr = extractJson(rawText);
    const parsed = JSON.parse(jsonStr);
    return TranscriptResultSchema.parse(parsed);
  } catch {
    // Graceful degradation: treat model output as plain transcript text
    console.warn("transcribeAudio: JSON parse failed, using raw text as fallback");
    return buildTranscriptFallback(rawText);
  }
}

export async function analyzeTask(
  transcript: string,
  userContext: string = "",
  attachments: AttachmentForGemini[] = []
): Promise<AnalysisResult> {
  const client = getClient();

  // Split attachments into inline (images/PDF) vs text-readable
  const inlineParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];
  const attachmentDescriptions: string[] = [];

  for (const att of attachments) {
    if (GEMINI_INLINE_MIMETYPES.has(att.mimeType)) {
      inlineParts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: att.data.toString("base64"),
        },
      });
      attachmentDescriptions.push(`${att.filename} (${att.mimeType}) — sent as inline data`);
    } else {
      // Text-like file: decode and append as context description
      const textContent = att.data.toString("utf-8").slice(0, 4000); // cap at 4k chars
      attachmentDescriptions.push(
        `${att.filename} (${att.mimeType}):\n${textContent}${textContent.length >= 4000 ? "\n[...truncated]" : ""}`
      );
    }
  }

  const prompt = buildAnalysisPrompt(transcript, userContext, attachmentDescriptions);

  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          ...inlineParts,
          { text: prompt },
        ],
      },
    ],
    config: { temperature: 0.3, maxOutputTokens: 4096 },
  });

  const rawText = response.text ?? "";

  try {
    const jsonStr = extractJson(rawText);
    const parsed = JSON.parse(jsonStr);
    return AnalysisResultSchema.parse(parsed);
  } catch {
    console.warn("analyzeTask: JSON parse failed, using safe fallback analysis");
    return buildAnalysisFallback(transcript);
  }
}
