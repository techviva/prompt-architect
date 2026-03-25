"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { saveToHistory, getFromHistory } from "@/lib/client-store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/shared/copy-button";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  formatDate,
  formatFileSize,
  getComplexityColor,
  getPlatformLabel,
  getTaskTypeLabel,
} from "@/lib/utils";
import {
  ArrowLeft,
  FileAudio,
  Brain,
  Target,
  Sparkles,
  AlertTriangle,
  Info,
  GitBranch,
  ChevronRight,
  Download,
} from "lucide-react";

interface RequestDetail {
  id: string;
  title: string | null;
  status: string;
  targetPlatform: string;
  userContext: string | null;
  parentRequestId: string | null;
  continuationContext: string | null;
  errorMessage: string | null;
  createdAt: string;
  audioAsset: {
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    durationSeconds: number | null;
  } | null;
  attachments: Array<{
    id: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
  }>;
  transcript: {
    rawTranscript: string;
    cleanedTranscript: string;
    language: string | null;
  } | null;
  analysis: {
    taskType: string;
    taskSubtype: string | null;
    complexityScore: number;
    complexityLevel: string;
    complexityDrivers: string[];
    suggestedPlatform: string;
    suggestedModel: string;
    suggestedMethodology: string;
    requiredCapabilities: Record<string, boolean>;
    missingInformation: string[];
    risksOrWarnings: string[];
    title: string;
  } | null;
  prompts: {
    platform: string;
    finalPrompt: string;
    followUpPrompt: string;
    revisionPrompt: string;
    templateUsed: string | null;
  } | null;
  job: {
    status: string;
    progress: number;
    startedAt: string | null;
    completedAt: string | null;
    failedAt: string | null;
    errorMessage: string | null;
    attempts: number;
  } | null;
  parentRequest: { id: string; title: string | null } | null;
  childRequests: Array<{ id: string; title: string | null; createdAt: string }>;
}

const ACTIVE_STATUSES = ["uploaded", "queued", "transcribing", "analyzing", "generating_prompt"];

function buildExportText(data: RequestDetail): string {
  const sep = "─".repeat(60);
  const lines: string[] = [
    `PROMPT ARCHITECT — EXPORT`,
    sep,
    `Title    : ${data.title ?? "Untitled"}`,
    `Date     : ${formatDate(data.createdAt)}`,
    `Platform : ${getPlatformLabel(data.prompts?.platform ?? data.targetPlatform)}`,
    `Task     : ${getTaskTypeLabel(data.analysis?.taskType ?? "")}`,
    `Complexity: ${data.analysis?.complexityLevel ?? "—"} (${data.analysis?.complexityScore ?? "—"}/5)`,
    sep,
    "",
    "## FINAL PROMPT",
    sep,
    data.prompts?.finalPrompt ?? "",
    "",
    "## FOLLOW-UP PROMPT",
    sep,
    data.prompts?.followUpPrompt ?? "",
    "",
    "## REVISION PROMPT",
    sep,
    data.prompts?.revisionPrompt ?? "",
    "",
    "## TRANSCRIPT (CLEANED)",
    sep,
    data.transcript?.cleanedTranscript ?? "",
    "",
  ];
  return lines.join("\n");
}

function downloadAsText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/requests/${id}`);
      if (!res.ok) {
        // Try localStorage fallback (serverless cold start)
        const cached = getFromHistory(id);
        if (cached) {
          setData(cached as unknown as RequestDetail);
          setLoading(false);
          return cached.status;
        }
        throw new Error("Request not found");
      }
      const json = await res.json();
      setData(json);
      // Save completed results to localStorage for persistence
      if (json.status === "completed" || json.status === "failed") {
        saveToHistory(json);
      }
      return json.status;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll while processing
  useEffect(() => {
    if (!data || !ACTIVE_STATUSES.includes(data.status)) return;

    const interval = setInterval(async () => {
      const status = await fetchData();
      if (status && !ACTIVE_STATUSES.includes(status)) {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [data?.status, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-20 text-center">
        <p className="text-destructive">{error ?? "Not found"}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isProcessing = ACTIVE_STATUSES.includes(data.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {data.title ?? "Processing Request..."}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={data.status} />
            <span className="text-sm text-muted-foreground">
              {formatDate(data.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {data.status === "completed" && data.prompts && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const slug = (data.title ?? "prompt")
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .slice(0, 40);
                downloadAsText(buildExportText(data), `${slug}.txt`);
              }}
            >
              <Download className="mr-1 h-3 w-3" /> Export
            </Button>
          )}
          <Link href={`/requests/new?continue=${data.id}`}>
            <Button variant="outline" size="sm">
              <GitBranch className="mr-1 h-3 w-3" /> Continue
            </Button>
          </Link>
        </div>
      </div>

      {/* Processing progress */}
      {isProcessing && data.job && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Processing...</p>
              <span className="text-sm text-muted-foreground">
                {data.job.progress}%
              </span>
            </div>
            <Progress value={data.job.progress} />
            <p className="mt-2 text-xs text-muted-foreground">
              Status: {data.status.replace("_", " ")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {data.status === "failed" && (
        <Card className="border-red-200">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="font-medium text-red-700">Processing Failed</p>
              <p className="mt-1 text-sm text-red-600">
                {data.errorMessage ?? data.job?.errorMessage ?? "Unknown error"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audio info */}
      {data.audioAsset && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <FileAudio className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {data.audioAsset.originalFilename}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(data.audioAsset.sizeBytes)} &middot;{" "}
                {data.audioAsset.mimeType}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parent/child chain */}
      {(data.parentRequest || data.childRequests.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              <GitBranch className="mr-1 inline h-4 w-4" /> Revision Chain
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.parentRequest && (
              <Link
                href={`/requests/${data.parentRequest.id}`}
                className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/50"
              >
                <span className="text-muted-foreground">Parent:</span>
                <span className="truncate">
                  {data.parentRequest.title ?? data.parentRequest.id}
                </span>
                <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </Link>
            )}
            {data.childRequests.map((child) => (
              <Link
                key={child.id}
                href={`/requests/${child.id}`}
                className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/50"
              >
                <span className="text-muted-foreground">Continuation:</span>
                <span className="truncate">{child.title ?? child.id}</span>
                <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Results - only show when completed */}
      {data.status === "completed" && data.analysis && data.prompts && data.transcript && (
        <>
          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" /> Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Task Type</p>
                  <p className="font-medium">
                    {getTaskTypeLabel(data.analysis.taskType)}
                    {data.analysis.taskSubtype && (
                      <span className="text-muted-foreground">
                        {" "}
                        / {data.analysis.taskSubtype}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Complexity</p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={getComplexityColor(data.analysis.complexityLevel)}
                    >
                      {data.analysis.complexityLevel.replace("_", " ")} (
                      {data.analysis.complexityScore}/5)
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Recommended Platform
                  </p>
                  <p className="font-medium">
                    {getPlatformLabel(data.analysis.suggestedPlatform)}
                    <span className="text-sm text-muted-foreground">
                      {" "}
                      ({data.analysis.suggestedModel})
                    </span>
                  </p>
                </div>
              </div>

              {/* Complexity Drivers */}
              {data.analysis.complexityDrivers.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    Complexity Drivers
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-0.5">
                    {data.analysis.complexityDrivers.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Methodology */}
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Suggested Methodology
                </p>
                <p className="text-sm">{data.analysis.suggestedMethodology}</p>
              </div>
            </CardContent>
          </Card>

          {/* Capabilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" /> Required Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.analysis.requiredCapabilities)
                  .filter(([, v]) => v)
                  .map(([key]) => (
                    <Badge key={key} variant="outline">
                      {key.replace("needs", "").replace(/([A-Z])/g, " $1").trim()}
                    </Badge>
                  ))}
                {Object.values(data.analysis.requiredCapabilities).every(
                  (v) => !v
                ) && (
                  <p className="text-sm text-muted-foreground">
                    No special capabilities required
                  </p>
                )}
              </div>

              {/* Missing info */}
              {data.analysis.missingInformation.length > 0 && (
                <div className="mt-4 rounded-md border border-yellow-200 bg-yellow-50 p-3">
                  <p className="text-sm font-medium text-yellow-800 flex items-center gap-1">
                    <Info className="h-4 w-4" /> Missing Information
                  </p>
                  <ul className="mt-1 list-disc list-inside text-sm text-yellow-700 space-y-0.5">
                    {data.analysis.missingInformation.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risks */}
              {data.analysis.risksOrWarnings.length > 0 && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-800 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> Risks & Warnings
                  </p>
                  <ul className="mt-1 list-disc list-inside text-sm text-red-700 space-y-0.5">
                    {data.analysis.risksOrWarnings.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prompts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" /> Generated Prompts
              </CardTitle>
              <CardDescription>
                Platform: {getPlatformLabel(data.prompts.platform)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="final" className="w-full">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="final">Final Prompt</TabsTrigger>
                  <TabsTrigger value="followup">Follow-up</TabsTrigger>
                  <TabsTrigger value="revision">Revision</TabsTrigger>
                </TabsList>

                <TabsContent value="final">
                  <div className="relative">
                    <div className="absolute right-2 top-2">
                      <CopyButton text={data.prompts.finalPrompt} />
                    </div>
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 pr-20 text-sm">
                      {data.prompts.finalPrompt}
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="followup">
                  <div className="relative">
                    <div className="absolute right-2 top-2">
                      <CopyButton text={data.prompts.followUpPrompt} />
                    </div>
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 pr-20 text-sm">
                      {data.prompts.followUpPrompt}
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="revision">
                  <div className="relative">
                    <div className="absolute right-2 top-2">
                      <CopyButton text={data.prompts.revisionPrompt} />
                    </div>
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 pr-20 text-sm">
                      {data.prompts.revisionPrompt}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Transcript */}
          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
              <CardDescription>
                {data.transcript.language && `Language: ${data.transcript.language}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="cleaned">
                <TabsList>
                  <TabsTrigger value="cleaned">Cleaned</TabsTrigger>
                  <TabsTrigger value="raw">Raw</TabsTrigger>
                </TabsList>
                <TabsContent value="cleaned">
                  <div className="relative">
                    <div className="absolute right-2 top-2">
                      <CopyButton text={data.transcript.cleanedTranscript} />
                    </div>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 pr-20 text-sm">
                      {data.transcript.cleanedTranscript}
                    </pre>
                  </div>
                </TabsContent>
                <TabsContent value="raw">
                  <div className="relative">
                    <div className="absolute right-2 top-2">
                      <CopyButton text={data.transcript.rawTranscript} />
                    </div>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 pr-20 text-sm">
                      {data.transcript.rawTranscript}
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
