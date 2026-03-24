"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface HealthData {
  status: string;
  timestamp: string;
  checks: Record<string, { status: string; message?: string }>;
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const getIcon = (status: string) => {
    if (status === "healthy" || status === "configured")
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status === "not_configured")
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getBadgeClass = (status: string) => {
    if (status === "healthy" || status === "configured")
      return "bg-green-100 text-green-700";
    if (status === "not_configured")
      return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">
            Service status and connectivity
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Overall status */}
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          {health ? (
            <>
              {health.status === "healthy" ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              )}
              <div>
                <p className="text-lg font-semibold capitalize">{health.status}</p>
                <p className="text-sm text-muted-foreground">
                  Last checked: {new Date(health.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </>
          ) : loading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          ) : (
            <>
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-lg font-semibold">Unreachable</p>
                <p className="text-sm text-muted-foreground">
                  Could not connect to the health endpoint
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Individual checks */}
      {health && (
        <div className="space-y-3">
          {Object.entries(health.checks).map(([name, check]) => (
            <Card key={name}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {getIcon(check.status)}
                  <div>
                    <p className="font-medium capitalize">{name}</p>
                    {check.message && (
                      <p className="text-sm text-muted-foreground">
                        {check.message}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className={getBadgeClass(check.status)}>
                  {check.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
