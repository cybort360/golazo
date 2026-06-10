import { kv } from "@vercel/kv";
import type { BuybackEntry } from "@/lib/buyback";

// Read from KV on every request; don't prerender at build time (KV may be
// unconfigured then).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entries = (await kv.get<BuybackEntry[]>("buyback_history")) ?? [];
    const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
    return Response.json({ entries: sorted });
  } catch {
    // KV not configured or unreachable, so degrade gracefully.
    return Response.json({ entries: [] });
  }
}
