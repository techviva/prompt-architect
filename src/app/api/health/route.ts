import { NextResponse } from "next/server";
import { db } from "@/lib/adapters/db";

export async function GET() {
  const checks: Record<string, { status: string; message?: string }> = {};

  // Check database
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = { status: "healthy" };
  } catch (error) {
    checks.database = {
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }

  // Check Redis
  try {
    const { getQueue } = await import("@/lib/adapters/queue");
    const queue = getQueue();
    // If we can create the queue, connection params are valid
    const counts = await queue.getJobCounts();
    checks.redis = { status: "healthy", message: `Jobs: ${JSON.stringify(counts)}` };
  } catch (error) {
    checks.redis = {
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }

  // Check Gemini API key presence
  checks.gemini = {
    status: process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "mock-key-for-development"
      ? "configured"
      : "not_configured",
  };

  const allHealthy = Object.values(checks).every(
    (c) => c.status === "healthy" || c.status === "configured"
  );

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
