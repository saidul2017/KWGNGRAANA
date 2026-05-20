import { NextResponse } from "next/server";
import { get } from "@/lib/db";
import { isLlmEnabled, llmModel } from "@/lib/llm";

/**
 * GET /api/health — health check untuk monitoring/load balancer.
 * Public, tidak auth. Tidak expose secret.
 */
export async function GET() {
  const checks: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "kwgn-learning-hub",
  };

  // DB check: query trivial
  try {
    const r = await get<{ c: number }>(`SELECT COUNT(*) AS c FROM users`);
    checks.db = { ok: true, users: r?.c ?? 0 };
  } catch (err) {
    checks.status = "degraded";
    checks.db = { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }

  checks.llm = {
    enabled: isLlmEnabled(),
    model: isLlmEnabled() ? llmModel() : null,
  };

  return NextResponse.json(checks, {
    status: checks.status === "ok" ? 200 : 503,
  });
}
