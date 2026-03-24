"use client";

import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileAudio, X } from "lucide-react";
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

export function AudioUploader({ file, onFileChange, disabled }: AudioUploaderProps) {
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
    maxSize: 100 * 1024 * 1024,
    disabled,
  });

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

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <input {...getInputProps()} />
      <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
      <p className="text-sm font-medium">
        {isDragActive ? "Drop your audio file here" : "Drop audio file or tap to upload"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        MP3, WAV, M4A, WebM, OGG, AAC — up to 100MB
      </p>
    </div>
  );
}
