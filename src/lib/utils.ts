import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    uploaded: "bg-gray-100 text-gray-700",
    queued: "bg-blue-100 text-blue-700",
    transcribing: "bg-yellow-100 text-yellow-700",
    analyzing: "bg-orange-100 text-orange-700",
    generating_prompt: "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  return colors[status] ?? "bg-gray-100 text-gray-700";
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    uploaded: "Uploaded",
    queued: "Queued",
    transcribing: "Transcribing",
    analyzing: "Analyzing",
    generating_prompt: "Generating Prompt",
    completed: "Completed",
    failed: "Failed",
  };
  return labels[status] ?? status;
}

export function getComplexityColor(level: string): string {
  const colors: Record<string, string> = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    very_high: "bg-red-100 text-red-700",
  };
  return colors[level] ?? "bg-gray-100 text-gray-700";
}

export function getPlatformLabel(platform: string): string {
  const labels: Record<string, string> = {
    auto: "Auto",
    chatgpt: "ChatGPT",
    claude: "Claude",
    gemini: "Gemini",
    generic: "Generic",
  };
  return labels[platform] ?? platform;
}

export function getTaskTypeLabel(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
