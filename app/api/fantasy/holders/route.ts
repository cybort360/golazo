import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getSeasonPot, getWeeklyPot } from "@/lib/fpl/store";
import { activeGameweek, upcomingGameweek } from "@/lib/fpl/gameweeks";

export const dynamic = "force-dynamic";

// kv.get can throw synchronously when KV isn't configured, so guard it.
async function threshold(): Promise<number> {
  try {
    return (await kv.get<number>("pred_min_golazo")) ?? 0;
  } catch {
    return 0;
  }
}

// Public: the Holders League prize state — the season pot, the current
// gameweek's weekly pot, and the $GOLAZO hold threshold. Eligibility per player
// is checked at payout (see the admin payouts route); the page shows the
// signed-in user's own status via /api/fantasy/mine.
export async function GET() {
  const now = Date.now();
  const gw = activeGameweek(now) ?? upcomingGameweek(now);

  const [seasonPot, weeklyPot, min] = await Promise.all([
    getSeasonPot(),
    gw ? getWeeklyPot(gw.id) : Promise.resolve(0),
    threshold(),
  ]);

  return NextResponse.json({
    seasonPot,
    weeklyPot,
    gw: gw ? { id: gw.id, label: gw.label } : null,
    threshold: min,
  });
}
