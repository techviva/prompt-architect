import { db } from "@/lib/adapters/db";
import { getStorage } from "@/lib/adapters/storage";
import { transcribeAudio, analyzeTask } from "@/lib/services/gemini";
import { getRecommendation, resolveTargetPlatform } from "@/lib/services/recommendation";
import { generatePromptPackage } from "@/lib/templates";

interface JobData {
  requestId: string;
}

export async function processAudioJob(
  data: JobData,
  updateProgress: (progress: number) => Promise<void>
): Promise<void> {
  const { requestId } = data;

  const request = await db.request.findUnique({
    where: { id: requestId },
    include: { audioAsset: true, parentRequest: { include: { transcript: true, analysisResult: true } } },
  });

  if (!request) throw new Error(`Request ${requestId} not found`);
  if (!request.audioAsset) throw new Error(`No audio asset for request ${requestId}`);

  const storage = getStorage();

  try {
    // ── Step 1: Transcription ──
    await updateStatus(requestId, "transcribing");
    await updateProgress(10);

    const audioData = await storage.download(request.audioAsset.storageKey);
    const transcriptResult = await transcribeAudio(audioData, request.audioAsset.mimeType);

    await db.transcript.create({
      data: {
        requestId,
        rawTranscript: transcriptResult.rawTranscript,
        cleanedTranscript: transcriptResult.cleanedTranscript,
        language: transcriptResult.language,
        durationProcessed: transcriptResult.durationProcessed,
      },
    });
    await updateProgress(33);

    // ── Step 2: Analysis ──
    await updateStatus(requestId, "analyzing");

    const userContext = [
      request.userContext ?? "",
      request.continuationContext ?? "",
    ]
      .filter(Boolean)
      .join("\n\n");

    // If continuation, include parent transcript for context
    let enrichedContext = userContext;
    if (request.parentRequest?.transcript) {
      enrichedContext = `PREVIOUS REQUEST TRANSCRIPT:\n${request.parentRequest.transcript.cleanedTranscript}\n\nNEW CONTEXT:\n${userContext}`;
    }

    const analysis = await analyzeTask(transcriptResult.cleanedTranscript, enrichedContext);

    await db.analysisResult.create({
      data: {
        requestId,
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
    });
    await updateProgress(66);

    // ── Step 3: Prompt Generation ──
    await updateStatus(requestId, "generating_prompt");

    const recommendation = getRecommendation(analysis);
    const targetPlatform = resolveTargetPlatform(
      request.targetPlatform,
      recommendation
    );

    const parentContext = request.parentRequest?.transcript?.cleanedTranscript;

    const promptPackage = generatePromptPackage(
      transcriptResult.cleanedTranscript,
      analysis,
      targetPlatform,
      request.userContext ?? undefined,
      parentContext,
      request.continuationContext ?? undefined
    );

    await db.promptArtifact.create({
      data: {
        requestId,
        platform: targetPlatform,
        finalPrompt: promptPackage.finalPrompt,
        followUpPrompt: promptPackage.followUpPrompt,
        revisionPrompt: promptPackage.revisionPrompt,
        templateUsed: promptPackage.templateUsed,
      },
    });

    // ── Complete ──
    await db.request.update({
      where: { id: requestId },
      data: {
        status: "completed",
        title: analysis.title,
      },
    });

    await db.processingJob.update({
      where: { requestId },
      data: {
        status: "completed",
        progress: 100,
        completedAt: new Date(),
      },
    });

    await updateProgress(100);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await db.request.update({
      where: { id: requestId },
      data: { status: "failed", errorMessage },
    });

    await db.processingJob.update({
      where: { requestId },
      data: {
        status: "failed",
        failedAt: new Date(),
        errorMessage,
      },
    });

    throw error;
  }
}

async function updateStatus(
  requestId: string,
  status: "transcribing" | "analyzing" | "generating_prompt"
) {
  await Promise.all([
    db.request.update({ where: { id: requestId }, data: { status } }),
    db.processingJob.update({
      where: { requestId },
      data: { status, startedAt: new Date() },
    }),
  ]);
}
