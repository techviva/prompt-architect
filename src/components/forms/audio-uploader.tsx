"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileAudio, X, Mic, Square } from "lucide-react";
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

export function AudioUploader({ file, onFileChange, disabled }: AudioUploaderProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Choose best supported format
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
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        // Build file from chunks
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.includes("webm") ? "webm" : "m4a";
        const fileName = `recording-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${ext}`;
        const audioFile = new File([blob], fileName, { type: mimeType });
        onFileChange(audioFile);
      };

      recorder.start(1000); // collect data every second
      setRecording(true);
      setElapsed(0);

      // Start timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 200);
    } catch (err) {
      console.error("Microphone access error:", err);
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setMicError("Microphone access denied. Please allow microphone permissions.");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setMicError("No microphone found on this device.");
      } else {
        setMicError("Could not access microphone. Please check your browser settings.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileChange(acceptedFiles[0]);
      }
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

  // ── File selected state ──
  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
        <FileAudio className="h-8 w-8 shrink-0 text-green-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onFileChange(null)}
          disabled={disabled}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // ── Recording state ──
  if (recording) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-red-300 bg-red-50 p-8">
        {/* Pulsing recording indicator */}
        <div className="relative mb-4">
          <div className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-30" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg">
            <Mic className="h-7 w-7 text-white" />
          </div>
        </div>

        <p className="text-lg font-semibold text-red-700">Recording...</p>
        <p className="mt-1 font-mono text-2xl font-bold text-red-600">
          {formatDuration(elapsed)}
        </p>

        {/* Animated waveform bars */}
        <div className="mt-3 flex items-center gap-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-red-400"
              style={{
                height: `${12 + Math.sin((elapsed * 3 + i * 0.8) * 1.2) * 10 + Math.random() * 6}px`,
                transition: "height 0.15s ease",
              }}
            />
          ))}
        </div>

        {/* Stop button */}
        <button
          type="button"
          onClick={stopRecording}
          className="mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label="Stop recording"
        >
          <Square className="h-6 w-6 fill-current" />
        </button>
        <p className="mt-2 text-xs text-red-500">Tap to stop and process</p>
      </div>
    );
  }

  // ── Default upload + record state ──
  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          {isDragActive ? "Drop your audio file here" : "Drop audio file or tap to upload"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          MP3, WAV, M4A, WebM, OGG, AAC — up to 25MB
        </p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">or record directly</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Record button */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={startRecording}
          disabled={disabled}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 active:scale-95",
            disabled && "cursor-not-allowed opacity-50"
          )}
          aria-label="Start recording"
        >
          <Mic className="h-6 w-6" />
        </button>
        <p className="mt-2 text-xs text-muted-foreground">
          Tap to start recording
        </p>
      </div>

      {/* Mic error */}
      {micError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-center text-sm text-red-600">
          {micError}
        </div>
      )}
    </div>
  );
}
