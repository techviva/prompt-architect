import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, { status: string; message?: string }> = {};

  // Check Gemini API key presence
  const hasKey =
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== "mock-key-for-development";
  checks.gemini = {
    status: hasKey ? "configured" : "not_configured",
    message: hasKey ? "API key is set" : "Set GEMINI_API_KEY environment variable",
  };

  // Runtime info
  checks.runtime = {
    status: "healthy",
    message: "Vercel serverless / Node.js",
  };

  // Storage mode
  checks.storage = {
    status: "healthy",
    message: "In-memory (serverless). History persists in browser localStorage.",
  };

  const allHealthy = checks.gemini.status === "configured";

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: "0.2.0",
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
