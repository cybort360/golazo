import { kv } from "@vercel/kv";
import type { WeeklyPrize } from "@/lib/weeklyPrize";

// Read from KV on every request; don't prerender at build time (KV may be
// unconfigured then).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const current = (await kv.get<WeeklyPrize>("weekly_prize")) ?? null;
    const history = (await kv.get<WeeklyPrize[]>("weekly_prize_history")) ?? [];
    return Response.json({ current, history });
  } catch {
    // KV not configured or unreachable, so degrade gracefully.
    return Response.json({ current: null, history: [] });
  }
}
