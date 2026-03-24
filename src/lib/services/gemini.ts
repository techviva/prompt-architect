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

function buildAnalysisPrompt(transcript: string, userContext: string): string {
  return `You are a senior AI workflow architect. Analyze the following user request and produce a structured assessment.

USER'S REQUEST (transcribed from audio):
${transcript}

${userContext ? `ADDITIONAL CONTEXT PROVIDED BY USER:\n${userContext}\n` : ""}

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
  "title": "A concise 5-10 word title summarizing this request"
}

Return ONLY the JSON object, no markdown formatting.`;
}

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
          {
            inlineData: {
              mimeType,
              data: base64Audio,
            },
          },
          { text: TRANSCRIPTION_PROMPT },
        ],
      },
    ],
    config: {
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  });

  const text = response.text ?? "";
  const jsonStr = extractJson(text);
  const parsed = JSON.parse(jsonStr);
  return TranscriptResultSchema.parse(parsed);
}

export async function analyzeTask(
  transcript: string,
  userContext: string = ""
): Promise<AnalysisResult> {
  const client = getClient();
  const prompt = buildAnalysisPrompt(transcript, userContext);

  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: 0.3,
      maxOutputTokens: 4096,
    },
  });

  const text = response.text ?? "";
  const jsonStr = extractJson(text);
  const parsed = JSON.parse(jsonStr);
  return AnalysisResultSchema.parse(parsed);
}

function extractJson(text: string): string {
  // Try to extract JSON from markdown code blocks or raw text
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // Try to find JSON object directly
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];

  return text.trim();
}
