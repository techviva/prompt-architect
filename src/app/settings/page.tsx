"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Database, Server, Key, HardDrive } from "lucide-react";

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
            Single-user mode is active. Authentication is not required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Mode</span>
            <Badge variant="secondary">Single User</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Version</span>
            <Badge variant="outline">0.1.0</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" /> API Configuration
          </CardTitle>
          <CardDescription>
            API keys are managed via environment variables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Gemini API Key</span>
            <Badge variant="outline">
              Configured via GEMINI_API_KEY env var
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" /> Storage
          </CardTitle>
          <CardDescription>
            File storage configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Storage Adapter</span>
            <Badge variant="outline">
              Configured via STORAGE_ADAPTER env var
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Max Audio Size</span>
            <span className="text-sm text-muted-foreground">100 MB</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Max Attachment Size</span>
            <span className="text-sm text-muted-foreground">25 MB</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" /> Infrastructure
          </CardTitle>
          <CardDescription>
            Backend service configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Database</span>
            <Badge variant="outline">PostgreSQL</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Queue</span>
            <Badge variant="outline">Redis + BullMQ</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">AI Provider</span>
            <Badge variant="outline">Google Gemini</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
