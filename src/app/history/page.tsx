"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  formatRelativeTime,
  getComplexityColor,
  getPlatformLabel,
  getTaskTypeLabel,
} from "@/lib/utils";
import {
  Search,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Filter,
  X,
} from "lucide-react";

interface RequestItem {
  id: string;
  title: string | null;
  status: string;
  targetPlatform: string;
  createdAt: string;
  taskType: string | null;
  complexityLevel: string | null;
  parentRequestId: string | null;
}

interface PageData {
  items: RequestItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function HistoryPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [taskType, setTaskType] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [complexity, setComplexity] = useState("all");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (taskType !== "all") params.set("taskType", taskType);
    if (platform !== "all") params.set("platform", platform);
    if (complexity !== "all") params.set("complexityLevel", complexity);
    params.set("page", String(page));
    params.set("pageSize", "20");

    try {
      const res = await fetch(`/api/requests?${params}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, taskType, platform, complexity, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearFilters = () => {
    setSearch("");
    setTaskType("all");
    setPlatform("all");
    setComplexity("all");
    setPage(1);
  };

  const hasFilters = search || taskType !== "all" || platform !== "all" || complexity !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">History</h1>
          <p className="text-muted-foreground">
            {data ? `${data.total} request${data.total !== 1 ? "s" : ""}` : "Loading..."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-1 h-4 w-4" />
          Filters
          {hasFilters && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              !
            </Badge>
          )}
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        {showFilters && (
          <Card>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
              <div>
                <label className="text-xs text-muted-foreground">Task Type</label>
                <Select value={taskType} onValueChange={(v) => { setTaskType(v); setPage(1); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {["research", "writing", "coding", "strategy", "operations", "analysis", "design", "automation", "document_editing", "planning"].map((t) => (
                      <SelectItem key={t} value={t}>{getTaskTypeLabel(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Platform</label>
                <Select value={platform} onValueChange={(v) => { setPlatform(v); setPage(1); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="chatgpt">ChatGPT</SelectItem>
                    <SelectItem value="claude">Claude</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                    <SelectItem value="generic">Generic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Complexity</label>
                <Select value={complexity} onValueChange={(v) => { setComplexity(v); setPage(1); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="very_high">Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasFilters && (
                <div className="sm:col-span-3">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="mr-1 h-3 w-3" /> Clear filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No requests found</p>
            {hasFilters && (
              <Button variant="link" className="mt-2" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data?.items.map((item) => (
            <Link
              key={item.id}
              href={`/requests/${item.id}`}
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 active:bg-muted"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-sm">
                    {item.title ?? "Untitled"}
                  </p>
                  {item.parentRequestId && (
                    <GitBranch className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <StatusBadge status={item.status} />
                  {item.taskType && (
                    <Badge variant="outline" className="text-xs">
                      {getTaskTypeLabel(item.taskType)}
                    </Badge>
                  )}
                  {item.complexityLevel && (
                    <Badge
                      variant="secondary"
                      className={`text-xs ${getComplexityColor(item.complexityLevel)}`}
                    >
                      {item.complexityLevel.replace("_", " ")}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {getPlatformLabel(item.targetPlatform)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
