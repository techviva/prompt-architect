import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/adapters/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const request = await db.request.findUnique({
      where: { id },
      include: {
        audioAsset: true,
        attachments: true,
        transcript: true,
        analysisResult: true,
        promptArtifact: true,
        processingJob: true,
        parentRequest: {
          select: { id: true, title: true },
        },
        childRequests: {
          select: { id: true, title: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: request.id,
      title: request.title,
      status: request.status,
      targetPlatform: request.targetPlatform,
      userContext: request.userContext,
      parentRequestId: request.parentRequestId,
      continuationContext: request.continuationContext,
      errorMessage: request.errorMessage,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      audioAsset: request.audioAsset
        ? {
            originalFilename: request.audioAsset.originalFilename,
            mimeType: request.audioAsset.mimeType,
            sizeBytes: request.audioAsset.sizeBytes,
            durationSeconds: request.audioAsset.durationSeconds,
          }
        : null,
      attachments: request.attachments.map((a) => ({
        id: a.id,
        originalFilename: a.originalFilename,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
      })),
      transcript: request.transcript
        ? {
            rawTranscript: request.transcript.rawTranscript,
            cleanedTranscript: request.transcript.cleanedTranscript,
            language: request.transcript.language,
          }
        : null,
      analysis: request.analysisResult
        ? {
            taskType: request.analysisResult.taskType,
            taskSubtype: request.analysisResult.taskSubtype,
            complexityScore: request.analysisResult.complexityScore,
            complexityLevel: request.analysisResult.complexityLevel,
            complexityDrivers: request.analysisResult.complexityDrivers,
            suggestedPlatform: request.analysisResult.suggestedPlatform,
            suggestedModel: request.analysisResult.suggestedModel,
            suggestedMethodology: request.analysisResult.suggestedMethodology,
            requiredCapabilities: request.analysisResult.requiredCapabilities,
            missingInformation: request.analysisResult.missingInformation,
            risksOrWarnings: request.analysisResult.risksOrWarnings,
            title: request.analysisResult.title,
          }
        : null,
      prompts: request.promptArtifact
        ? {
            platform: request.promptArtifact.platform,
            finalPrompt: request.promptArtifact.finalPrompt,
            followUpPrompt: request.promptArtifact.followUpPrompt,
            revisionPrompt: request.promptArtifact.revisionPrompt,
            templateUsed: request.promptArtifact.templateUsed,
          }
        : null,
      job: request.processingJob
        ? {
            status: request.processingJob.status,
            progress: request.processingJob.progress,
            startedAt: request.processingJob.startedAt?.toISOString() ?? null,
            completedAt: request.processingJob.completedAt?.toISOString() ?? null,
            failedAt: request.processingJob.failedAt?.toISOString() ?? null,
            errorMessage: request.processingJob.errorMessage,
            attempts: request.processingJob.attempts,
          }
        : null,
      parentRequest: request.parentRequest,
      childRequests: request.childRequests.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt.toISOString(),
      })),
      tags: request.tags.map((t) => ({
        id: t.tag.id,
        name: t.tag.name,
        color: t.tag.color,
      })),
    });
  } catch (error) {
    console.error("Error fetching request:", error);
    return NextResponse.json(
      { error: "Failed to fetch request" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.request.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting request:", error);
    return NextResponse.json(
      { error: "Failed to delete request" },
      { status: 500 }
    );
  }
}
