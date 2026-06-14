import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { setMatchStats } from "@/lib/fpl/store";
import { fetchMatchStats } from "@/lib/footballDataMatchStats";
import type { PlayerMatchStats } from "@/lib/fpl/types";

export const dynamic = "force-dynamic";

// Admin: set the player stats for one of our fixtures (GM###). Either pass
// `stats` directly (manual entry / correction — the reliable path), or pass
// `fdMatchId` to auto-fetch and parse from football-data once the Deep Data
// tier is live. Storing recomputes the leaderboard on its next read.
export async function POST(request: Request) {
  if (!isAdminRequest()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { matchId?: unknown; stats?: unknown; fdMatchId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  if (typeof body.matchId !== "string" || !body.matchId) {
    return NextResponse.json({ ok: false, error: "matchId required" }, { status: 400 });
  }

  let stats: PlayerMatchStats[];
  if (Array.isArray(body.stats)) {
    stats = body.stats as PlayerMatchStats[];
  } else if (typeof body.fdMatchId === "string" && body.fdMatchId) {
    try {
      stats = await fetchMatchStats(body.fdMatchId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Fetch failed";
      return NextResponse.json({ ok: false, error: msg }, { status: 502 });
    }
  } else {
    return NextResponse.json(
      { ok: false, error: "Provide stats[] or fdMatchId" },
      { status: 400 },
    );
  }

  try {
    await setMatchStats(body.matchId, stats);
  } catch {
    return NextResponse.json({ ok: false, error: "KV error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, matchId: body.matchId, players: stats.length });
}
