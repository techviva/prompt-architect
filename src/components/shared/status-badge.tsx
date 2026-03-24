"use client";

import { Badge } from "@/components/ui/badge";
import { getStatusColor, getStatusLabel } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

const PROCESSING_STATUSES = ["queued", "transcribing", "analyzing", "generating_prompt"];

export function StatusBadge({ status }: StatusBadgeProps) {
  const isProcessing = PROCESSING_STATUSES.includes(status);

  return (
    <Badge variant="secondary" className={getStatusColor(status)}>
      {isProcessing && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
      {getStatusLabel(status)}
    </Badge>
  );
}
