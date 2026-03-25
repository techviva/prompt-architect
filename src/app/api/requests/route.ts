import { NextRequest, NextResponse } from "next/server";
import { createRequest, listRequests, updateRequest } from "@/lib/adapters/db";
import { ALLOWED_AUDIO_MIMETYPES, ALLOWED_ATTACHMENT_MIMETYPES } from "@/lib/config/constants";
import { getMaxAudioSizeBytes, getMaxAttachmentSizeBytes } from "@/lib/config/env";
import { transcribeAudio, analyzeTask, type AttachmentForGemini } from "@/lib/services/gemini";
import { getRecommendation, resolveTargetPlatform } from "@/lib/services/recommendation";
import { generatePromptPackage } from "@/lib/templates";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const targetPlatform = (formData.get("targetPlatform") as string) ?? "auto";
    const userContext = (formData.get("userContext") as string) ?? "";
    const parentRequestId = (formData.get("parentRequestId") as string) || undefined;
    const continuationContext = (formData.get("continuationContext") as string) ?? "";

    if (!audioFile) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
    }

    // Normalize MIME type: strip codec parameters
    // e.g. "audio/webm;codecs=opus" → "audio/webm"
    const audioMimeType = audioFile.type.split(";")[0].trim();

    if (
      !ALLOWED_AUDIO_MIMETYPES.includes(
        audioMimeType as (typeof ALLOWED_AUDIO_MIMETYPES)[number]
      )
    ) {
      return NextResponse.json(
        {
          error: `Invalid audio type: ${audioFile.type}. Allowed: ${ALLOWED_AUDIO_MIMETYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (audioFile.size > getMaxAudioSizeBytes()) {
      return NextResponse.json(
        { error: `Audio file too large. Maximum: ${getMaxAudioSizeBytes() / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Collect attachments (multi-value field "attachments")
    const rawAttachments = formData.getAll("attachments") as File[];
    const validAttachments = rawAttachments.filter(
      (f) =>
        f instanceof File &&
        f.size > 0 &&
        f.size <= getMaxAttachmentSizeBytes() &&
        ALLOWED_ATTACHMENT_MIMETYPES.includes(
          f.type as (typeof ALLOWED_ATTACHMENT_MIMETYPES)[number]
        )
    );

    // Create request record
    const request = createRequest({
      targetPlatform,
      userContext: userContext || null,
      parentRequestId: parentRequestId || null,
      continuationContext: continuationContext || null,
      audioAsset: {
        originalFilename: audioFile.name,
        mimeType: audioMimeType,
        sizeBytes: audioFile.size,
        durationSeconds: null,
      },
    });

    // Process synchronously (no worker/queue needed)
    processRequest(request.id, audioFile, audioMimeType, validAttachments, userContext, continuationContext, targetPlatform).catch(
      (err) => {
        console.error(`Processing failed for ${request.id}:`, err);
        updateRequest(request.id, {
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Processing failed",
          job: {
            status: "failed",
            progress: 0,
            startedAt: null,
            completedAt: null,
            failedAt: new Date().toISOString(),
            errorMessage: err instanceof Error ? err.message : "Processing failed",
            attempts: 1,
          },
        });
      }
    );

    return NextResponse.json({ id: request.id, status: "queued" }, { status: 201 });
  } catch (error) {
    console.error("Error creating request:", error);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}

async function processRequest(
  requestId: string,
  audioFile: File,
  audioMimeType: string,
  attachmentFiles: File[],
  userContext: string,
  continuationContext: string,
  targetPlatform: string
) {
  const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

  // Pre-load attachment buffers (done once, before any async steps)
  const attachments: AttachmentForGemini[] = await Promise.all(
    attachmentFiles.map(async (f) => ({
      data: Buffer.from(await f.arrayBuffer()),
      mimeType: f.type,
      filename: f.name,
    }))
  );

  // Step 1: Transcription
  updateRequest(requestId, {
    status: "transcribing",
    job: {
      status: "transcribing",
      progress: 10,
      startedAt: new Date().toISOString(),
      completedAt: null,
      failedAt: null,
      errorMessage: null,
      attempts: 1,
    },
  });

  const transcriptResult = await transcribeAudio(audioBuffer, audioMimeType);

  updateRequest(requestId, {
    transcript: {
      rawTranscript: transcriptResult.rawTranscript,
      cleanedTranscript: transcriptResult.cleanedTranscript,
      language: transcriptResult.language,
    },
    status: "analyzing",
    job: {
      status: "analyzing",
      progress: 33,
      startedAt: new Date().toISOString(),
      completedAt: null,
      failedAt: null,
      errorMessage: null,
      attempts: 1,
    },
  });

  // Step 2: Analysis (with attachments forwarded to Gemini)
  const enrichedContext = [userContext, continuationContext].filter(Boolean).join("\n\n");
  const analysis = await analyzeTask(
    transcriptResult.cleanedTranscript,
    enrichedContext,
    attachments
  );

  updateRequest(requestId, {
    analysis: {
      taskType: analysis.taskType,
      taskSubtype: analysis.taskSubtype,
      complexityScore: analysis.complexityScore,
      complexityLevel: analysis.complexityLevel,
      complexityDrivers: analysis.complexityDrivers,
      suggestedPlatform: analysis.suggestedPlatform,
      suggestedModel: analysis.suggestedModel,
      suggestedMethodology: analysis.suggestedMethodology,
      requiredCapabilities: analysis.requiredCapabilities as Record<string, boolean>,
      missingInformation: analysis.missingInformation,
      risksOrWarnings: analysis.risksOrWarnings,
      title: analysis.title,
    },
    status: "generating_prompt",
    job: {
      status: "generating_prompt",
      progress: 66,
      startedAt: new Date().toISOString(),
      completedAt: null,
      failedAt: null,
      errorMessage: null,
      attempts: 1,
    },
  });

  // Step 3: Prompt generation
  const recommendation = getRecommendation(analysis);
  const resolvedPlatform = resolveTargetPlatform(targetPlatform, recommendation);

  const promptPackage = generatePromptPackage(
    transcriptResult.cleanedTranscript,
    analysis,
    resolvedPlatform,
    userContext || undefined,
    undefined,
    continuationContext || undefined
  );

  updateRequest(requestId, {
    title: analysis.title,
    status: "completed",
    prompts: {
      platform: resolvedPlatform,
      finalPrompt: promptPackage.finalPrompt,
      followUpPrompt: promptPackage.followUpPrompt,
      revisionPrompt: promptPackage.revisionPrompt,
      templateUsed: promptPackage.templateUsed,
    },
    job: {
      status: "completed",
      progress: 100,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      failedAt: null,
      errorMessage: null,
      attempts: 1,
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const taskType = searchParams.get("taskType");
    const platform = searchParams.get("platform");
    const complexityLevel = searchParams.get("complexityLevel");
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "20");

    let items = listRequests();

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((r) => r.title?.toLowerCase().includes(q));
    }
    if (taskType) {
      items = items.filter((r) => r.analysis?.taskType === taskType);
    }
    if (platform && platform !== "auto") {
      items = items.filter((r) => r.targetPlatform === platform);
    }
    if (complexityLevel) {
      items = items.filter((r) => r.analysis?.complexityLevel === complexityLevel);
    }

    const total = items.length;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      items: paged.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        targetPlatform: r.targetPlatform,
        createdAt: r.createdAt,
        taskType: r.analysis?.taskType ?? null,
        complexityLevel: r.analysis?.complexityLevel ?? null,
        parentRequestId: r.parentRequestId,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}
