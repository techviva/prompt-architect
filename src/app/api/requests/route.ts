import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/adapters/db";
import { getStorage } from "@/lib/adapters/storage";
import { enqueueProcessingJob } from "@/lib/adapters/queue";
import { ALLOWED_AUDIO_MIMETYPES } from "@/lib/config/constants";
import { getMaxAudioSizeBytes, getMaxAttachmentSizeBytes } from "@/lib/config/env";
import { HistoryFiltersSchema } from "@/lib/schemas";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const targetPlatform = (formData.get("targetPlatform") as string) ?? "auto";
    const userContext = (formData.get("userContext") as string) ?? "";
    const parentRequestId = (formData.get("parentRequestId") as string) || undefined;
    const continuationContext = (formData.get("continuationContext") as string) ?? "";

    // Validate audio file
    if (!audioFile) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
    }

    if (!ALLOWED_AUDIO_MIMETYPES.includes(audioFile.type as typeof ALLOWED_AUDIO_MIMETYPES[number])) {
      return NextResponse.json(
        { error: `Invalid audio type: ${audioFile.type}. Allowed: ${ALLOWED_AUDIO_MIMETYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (audioFile.size > getMaxAudioSizeBytes()) {
      return NextResponse.json(
        { error: `Audio file too large. Maximum size: ${getMaxAudioSizeBytes() / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate parent request exists if provided
    if (parentRequestId) {
      const parent = await db.request.findUnique({ where: { id: parentRequestId } });
      if (!parent) {
        return NextResponse.json({ error: "Parent request not found" }, { status: 404 });
      }
    }

    // Store audio file
    const storage = getStorage();
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const ext = audioFile.name.split(".").pop() ?? "audio";
    const storageKey = `audio/${crypto.randomUUID()}.${ext}`;
    await storage.upload(storageKey, audioBuffer, audioFile.type);

    // Handle attachment files
    const attachmentEntries: Array<{
      originalFilename: string;
      mimeType: string;
      sizeBytes: number;
      storageKey: string;
    }> = [];

    const attachments = formData.getAll("attachments") as File[];
    for (const attachment of attachments) {
      if (attachment.size > getMaxAttachmentSizeBytes()) continue;
      const attBuffer = Buffer.from(await attachment.arrayBuffer());
      const attExt = attachment.name.split(".").pop() ?? "bin";
      const attKey = `attachments/${crypto.randomUUID()}.${attExt}`;
      await storage.upload(attKey, attBuffer, attachment.type);
      attachmentEntries.push({
        originalFilename: attachment.name,
        mimeType: attachment.type,
        sizeBytes: attachment.size,
        storageKey: attKey,
      });
    }

    // Create request with relations
    const request = await db.request.create({
      data: {
        targetPlatform: targetPlatform as "auto" | "chatgpt" | "claude" | "gemini" | "generic",
        userContext: userContext || null,
        parentRequestId: parentRequestId || null,
        continuationContext: continuationContext || null,
        audioAsset: {
          create: {
            originalFilename: audioFile.name,
            mimeType: audioFile.type,
            sizeBytes: audioFile.size,
            storageKey,
          },
        },
        attachments: {
          create: attachmentEntries,
        },
        processingJob: {
          create: {
            status: "queued",
          },
        },
      },
      include: {
        audioAsset: true,
        processingJob: true,
      },
    });

    // Enqueue processing job
    await db.request.update({
      where: { id: request.id },
      data: { status: "queued" },
    });

    const bullJobId = await enqueueProcessingJob(request.id);
    await db.processingJob.update({
      where: { requestId: request.id },
      data: { bullJobId },
    });

    return NextResponse.json(
      {
        id: request.id,
        status: "queued",
        jobId: bullJobId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating request:", error);
    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const params = Object.fromEntries(searchParams.entries());
    const filters = HistoryFiltersSchema.parse(params);

    const where: Record<string, unknown> = {};

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.taskType) {
      where.analysisResult = { taskType: filters.taskType };
    }

    if (filters.complexityLevel) {
      where.analysisResult = {
        ...(where.analysisResult as Record<string, unknown> ?? {}),
        complexityLevel: filters.complexityLevel,
      };
    }

    if (filters.platform && filters.platform !== "auto") {
      where.targetPlatform = filters.platform;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        (where.createdAt as Record<string, unknown>).lte = new Date(filters.dateTo);
      }
    }

    const [requests, total] = await Promise.all([
      db.request.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        include: {
          analysisResult: { select: { taskType: true, complexityLevel: true } },
        },
      }),
      db.request.count({ where }),
    ]);

    const items = requests.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      targetPlatform: r.targetPlatform,
      createdAt: r.createdAt.toISOString(),
      taskType: r.analysisResult?.taskType ?? null,
      complexityLevel: r.analysisResult?.complexityLevel ?? null,
      parentRequestId: r.parentRequestId,
    }));

    return NextResponse.json({
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: Math.ceil(total / filters.pageSize),
    });
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}
