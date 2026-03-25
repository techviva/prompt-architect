"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AudioUploader } from "@/components/forms/audio-uploader";
import { AttachmentUploader } from "@/components/forms/attachment-uploader";
import { Loader2, Send, GitBranch, Mic, Brain, Sparkles } from "lucide-react";
import { saveToHistory } from "@/lib/client-store";

function NewRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const continueFrom = searchParams.get("continue");

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [targetPlatform, setTargetPlatform] = useState("auto");
  const [userContext, setUserContext] = useState("");
  const [continuationContext, setContinuationContext] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [parentTitle, setParentTitle] = useState<string | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (continueFrom) {
      fetch(`/api/requests/${continueFrom}`)
        .then((r) => r.json())
        .then((data) => {
          setParentTitle(data.title ?? "Previous request");
          if (data.targetPlatform && data.targetPlatform !== "auto") {
            setTargetPlatform(data.targetPlatform);
          }
        })
        .catch(() => {});
    }
  }, [continueFrom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) {
      setError("Please upload an audio file");
      return;
    }

    setSubmitting(true);
    setProcessingStep(0);
    setError(null);

    // Cycle through step labels while the server processes synchronously
    const steps = [0, 1, 2, 3];
    let stepIdx = 0;
    stepTimerRef.current = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setProcessingStep(stepIdx);
    }, 8000); // advance label every ~8s

    try {
      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append("targetPlatform", targetPlatform);
      formData.append("userContext", userContext);
      if (continueFrom) {
        formData.append("parentRequestId", continueFrom);
        formData.append("continuationContext", continuationContext);
      }
      for (const att of attachments) {
        formData.append("attachments", att);
      }

      const res = await fetch("/api/requests", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create request");
      }

      const data = await res.json();

      // Persist the full result to localStorage BEFORE redirecting.
      // The detail page will load from here — the API may hit a different
      // Vercel instance with empty in-memory state.
      saveToHistory(data);

      router.push(`/requests/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    } finally {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {continueFrom ? "Continue Request" : "New Request"}
        </h1>
        <p className="text-muted-foreground">
          {continueFrom
            ? "Upload a new audio describing what to continue or change"
            : "Upload your audio and let us craft the perfect prompt"}
        </p>
      </div>

      {/* Continuation banner */}
      {continueFrom && parentTitle && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center gap-3 p-4">
            <GitBranch className="h-5 w-5 shrink-0 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Continuing from: {parentTitle}
              </p>
              <p className="text-xs text-blue-600">
                The previous analysis will be used as context
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Audio Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Record or upload your audio</CardTitle>
            <CardDescription>
              {continueFrom
                ? "Record what you want to continue, change, or revise"
                : "Tap to record directly, or upload an existing audio file"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AudioUploader
              file={audioFile}
              onFileChange={setAudioFile}
              disabled={submitting}
            />
          </CardContent>
        </Card>

        {/* Continuation context */}
        {continueFrom && (
          <Card>
            <CardHeader>
              <CardTitle>What happened since last time?</CardTitle>
              <CardDescription>
                Describe the conversation, results, or progress from the previous request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={continuationContext}
                onChange={(e) => setContinuationContext(e.target.value)}
                placeholder="E.g., The AI generated the code but it had a bug in the authentication module. I also added two new requirements..."
                rows={4}
                disabled={submitting}
              />
            </CardContent>
          </Card>
        )}

        {/* Platform Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Target Platform</CardTitle>
            <CardDescription>
              Choose a specific platform or let us recommend one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={targetPlatform}
              onValueChange={setTargetPlatform}
              disabled={submitting}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (Recommended)</SelectItem>
                <SelectItem value="chatgpt">ChatGPT</SelectItem>
                <SelectItem value="claude">Claude</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="generic">Generic / Neutral</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Context */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Context</CardTitle>
            <CardDescription>
              Optional: provide extra context, constraints, or background
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              placeholder="E.g., This is for a React app using TypeScript. The codebase uses Next.js 15 with App Router..."
              rows={4}
              disabled={submitting}
            />
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
            <CardDescription>
              Optional: add relevant files for context
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AttachmentUploader
              files={attachments}
              onFilesChange={setAttachments}
              disabled={submitting}
            />
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={!audioFile || submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {[
                  "Uploading audio…",
                  "Transcribing…",
                  "Analyzing request…",
                  "Generating prompts…",
                ][processingStep]}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {continueFrom ? "Process Continuation" : "Process Request"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewRequestPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center"><div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <NewRequestForm />
    </Suspense>
  );
}
