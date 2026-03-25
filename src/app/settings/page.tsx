"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Server, Key, HardDrive, Info } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Application configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> General
          </CardTitle>
          <CardDescription>
            Single-user mode. No authentication required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Mode</span>
            <Badge variant="secondary">Single User</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Version</span>
            <Badge variant="outline">0.2.0</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" /> AI Provider
          </CardTitle>
          <CardDescription>
            Transcription and analysis powered by Google Gemini
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Provider</span>
            <Badge variant="outline">Google Gemini 2.0 Flash</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">API Key</span>
            <Badge variant="outline">Configured via GEMINI_API_KEY env var</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" /> Storage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Processing</span>
            <Badge variant="outline">Serverless (Vercel)</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">History</span>
            <Badge variant="outline">Browser localStorage</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Max Audio Size</span>
            <span className="text-sm text-muted-foreground">25 MB</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" /> Architecture Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Audio is processed synchronously via Gemini API in serverless functions.</li>
            <li>Request history is stored in your browser&apos;s localStorage.</li>
            <li>No external database or queue system required for the MVP.</li>
            <li>For production use with persistent storage, add PostgreSQL + Redis + Worker.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
