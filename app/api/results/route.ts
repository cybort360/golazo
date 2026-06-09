import { kv } from "@vercel/kv";
import type { MatchResult } from "@/hooks/useMatchResults";

// Read from KV on every request; don't prerender at build time (KV may be
// unconfigured then).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const results = (await kv.get<MatchResult[]>("match_results")) ?? [];
    const champion = (await kv.get<string>("champion")) ?? null;
    return Response.json({ results, champion });
  } catch {
    // KV not configured or unreachable — degrade gracefully.
    return Response.json({ results: [], champion: null });
  }
}
