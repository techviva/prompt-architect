"use client";

import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Paperclip, X, FileText } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AttachmentUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
  "text/csv": [".csv"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "application/json": [".json"],
};

export function AttachmentUploader({
  files,
  onFilesChange,
  disabled,
}: AttachmentUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesChange([...files, ...acceptedFiles]);
    },
    [files, onFilesChange]
  );

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 25 * 1024 * 1024,
    disabled,
  });

  return (
    <div className="space-y-3">
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-md border p-2"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => removeFile(index)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-3 text-sm transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <input {...getInputProps()} />
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          Add attachments (PDF, TXT, images, up to 25MB each)
        </span>
      </div>
    </div>
  );
}
