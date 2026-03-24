"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle, History, ArrowRight, Zap, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStatusColor, getStatusLabel, formatRelativeTime, getTaskTypeLabel } from "@/lib/utils";

interface RequestSummary {
  id: string;
  title: string | null;
  status: string;
  targetPlatform: string;
  createdAt: string;
  taskType: string | null;
  complexityLevel: string | null;
}

interface DashboardData {
  items: RequestSummary[];
  total: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/requests?pageSize=5")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = data
    ? {
        total: data.total,
        completed: data.items.filter((r) => r.status === "completed").length,
        processing: data.items.filter(
          (r) => !["completed", "failed"].includes(r.status)
        ).length,
        failed: data.items.filter((r) => r.status === "failed").length,
      }
    : { total: 0, completed: 0, processing: 0, failed: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Transform your voice ideas into optimized prompts
          </p>
        </div>
        <Link href="/requests/new">
          <Button size="lg" className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-primary opacity-70" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500 opacity-70" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500 opacity-70" />
              <div>
                <p className="text-2xl font-bold">{stats.processing}</p>
                <p className="text-xs text-muted-foreground">Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-500 opacity-70" />
              <div>
                <p className="text-2xl font-bold">{stats.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Requests</CardTitle>
          <Link href="/history">
            <Button variant="ghost" size="sm">
              <History className="mr-2 h-4 w-4" />
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : data?.items.length === 0 ? (
            <div className="py-8 text-center">
              <Zap className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No requests yet</p>
              <Link href="/requests/new">
                <Button className="mt-4" variant="outline">
                  Create your first request
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {data?.items.map((request) => (
                <Link
                  key={request.id}
                  href={`/requests/${request.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 active:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">
                      {request.title ?? "Processing..."}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={getStatusColor(request.status)}
                      >
                        {getStatusLabel(request.status)}
                      </Badge>
                      {request.taskType && (
                        <span className="text-xs text-muted-foreground">
                          {getTaskTypeLabel(request.taskType)}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(request.createdAt)}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
