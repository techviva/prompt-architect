"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { FileAudio, X, Mic, Square, Upload } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AudioUploaderProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES: Record<string, string[]> = {
  "audio/mpeg": [".mp3"],
  "audio/wav": [".wav"],
  "audio/x-wav": [".wav"],
  "audio/mp4": [".m4a", ".mp4"],
  "audio/x-m4a": [".m4a"],
  "audio/webm": [".webm"],
  "audio/ogg": [".ogg"],
  "audio/aac": [".aac"],
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Manual rounded rectangle helper (avoids TS lib issues)
function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

export function AudioUploader({ file, onFileChange, disabled }: AudioUploaderProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Full cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ── Waveform drawing (real audio data) ─────────────────────────────────────
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    const bufferLength = analyser.frequencyBinCount; // fftSize / 2
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, W, H);

    const BAR_COUNT = 52;
    const step = Math.max(1, Math.floor(bufferLength / BAR_COUNT));
    const totalGap = W * 0.35;
    const barW = (W - totalGap) / BAR_COUNT;
    const gapW = totalGap / (BAR_COUNT - 1);
    const MIN_H = 4;

    for (let i = 0; i < BAR_COUNT; i++) {
      // Average a small range of bins for smoother look
      let sum = 0;
      const range = Math.max(1, step);
      for (let j = 0; j < range; j++) {
        sum += dataArray[i * step + j] ?? 0;
      }
      const value = sum / (range * 255); // 0–1
      const barH = MIN_H + value * (H - MIN_H * 2);
      const x = i * (barW + gapW);
      const y = (H - barH) / 2;

      // Green gradient — bright at top, softer at bottom
      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, "rgba(74, 222, 128, 1)");   // green-400
      grad.addColorStop(0.5, "rgba(34, 197, 94, 0.95)"); // green-500
      grad.addColorStop(1, "rgba(22, 163, 74, 0.7)");   // green-600
      ctx.fillStyle = grad;

      fillRoundRect(ctx, x, y, barW, barH, barW / 2);
    }

    rafRef.current = requestAnimationFrame(drawFrame);
  }, []);

  // ── Start recording ─────────────────────────────────────────────────────────
  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      // Web Audio analyser for waveform
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      // iOS Safari starts AudioContext suspended; resume after user gesture
      if (audioCtx.state === "suspended") await audioCtx.resume();

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;          // 64 frequency bins
      analyser.smoothingTimeConstant = 0.75; // smooths bar animation
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      // Start drawing
      rafRef.current = requestAnimationFrame(drawFrame);

      // Determine best supported format
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // Stop mic stream
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        // Build File and hand it up
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.includes("webm") ? "webm" : "m4a";
        const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        const audioFile = new File([blob], `recording-${ts}.${ext}`, {
          type: mimeType,
        });
        onFileChange(audioFile);
      };

      recorder.start(250); // collect chunks every 250 ms
      setRecording(true);
      setElapsed(0);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          setMicError(
            "Microphone access denied. Enable it in your browser settings and try again."
          );
        } else if (err.name === "NotFoundError") {
          setMicError("No microphone detected on this device.");
        } else {
          setMicError(`Microphone error: ${err.message}`);
        }
      } else {
        setMicError("Could not start recording. Please try again.");
      }
    }
  };

  // ── Stop recording ──────────────────────────────────────────────────────────
  const stopRecording = () => {
    // Stop RAF and timer immediately so canvas freezes cleanly
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    // Close audio context
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;

    // Stop MediaRecorder — onstop fires async and calls onFileChange
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    setRecording(false);
  };

  // ── Dropzone ────────────────────────────────────────────────────────────────
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) onFileChange(acceptedFiles[0]);
    },
    [onFileChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    maxSize: 25 * 1024 * 1024,
    disabled: disabled || recording,
    noClick: recording,
    noDrag: recording,
  });

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: file selected
  // ────────────────────────────────────────────────────────────────────────────
  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
          <FileAudio className="h-5 w-5 text-green-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-green-900">{file.name}</p>
          <p className="text-xs text-green-600">{formatFileSize(file.size)} · ready to process</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onFileChange(null)}
          disabled={disabled}
          className="shrink-0 text-green-700 hover:bg-green-100 hover:text-green-900"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: recording in progress
  // ────────────────────────────────────────────────────────────────────────────
  if (recording) {
    return (
      <div className="overflow-hidden rounded-2xl bg-zinc-950 shadow-xl">
        {/* Top bar: REC indicator + timer */}
        <div className="flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">
              Recording
            </span>
          </div>
          <span className="font-mono text-2xl font-bold tabular-nums text-white">
            {formatDuration(elapsed)}
          </span>
        </div>

        {/* Waveform canvas */}
        <div className="px-4 py-4">
          <canvas
            ref={canvasRef}
            width={480}
            height={72}
            className="h-[72px] w-full"
            aria-hidden="true"
          />
        </div>

        {/* Stop button */}
        <div className="flex flex-col items-center pb-6">
          <button
            type="button"
            onClick={stopRecording}
            className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.12)] transition-all duration-150 hover:scale-105 active:scale-95"
            aria-label="Stop recording"
          >
            {/* Red square stop icon */}
            <div className="h-6 w-6 rounded-sm bg-red-500 transition-colors group-hover:bg-red-600" />
          </button>
          <p className="mt-2.5 text-xs text-zinc-500">Tap to stop</p>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: idle — record (primary) + upload (secondary)
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* PRIMARY: Record button */}
      <button
        type="button"
        onClick={disabled ? undefined : startRecording}
        disabled={disabled}
        className={cn(
          "group relative w-full overflow-hidden rounded-2xl border-2 border-transparent bg-gradient-to-br from-zinc-900 to-zinc-800 px-6 py-8 text-center shadow-sm transition-all duration-200",
          !disabled &&
            "cursor-pointer hover:border-green-500/40 hover:shadow-md hover:shadow-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500",
          disabled && "cursor-not-allowed opacity-60"
        )}
        aria-label="Start recording"
      >
        {/* Subtle radial glow behind the mic */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-40 rounded-full bg-green-500/10 blur-2xl transition-all duration-500 group-hover:bg-green-500/20" />
        </div>

        {/* Mic icon circle */}
        <div className="relative mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/30 transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
          <Mic className="h-9 w-9 text-white" />
        </div>

        <p className="relative text-base font-semibold text-white">Tap to record</p>
        <p className="relative mt-1 text-sm text-zinc-400">
          Voice your idea and we&apos;ll handle the rest
        </p>
      </button>

      {/* Mic permission error */}
      {micError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {micError}
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3 px-1">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">or upload a file</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* SECONDARY: File drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed px-4 py-4 transition-all duration-150",
          isDragActive
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/40",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Upload className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {isDragActive ? "Drop your audio here" : "Drop a file or click to browse"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            MP3, WAV, M4A, WebM, OGG, AAC — up to 25 MB
          </p>
        </div>
      </div>
    </div>
  );
}
