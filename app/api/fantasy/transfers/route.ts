import { NextResponse } from "next/server";
import { resolvePlayerId } from "@/lib/predictionStore";
import { getPool, poolLookup, getTeam, saveTeam } from "@/lib/fpl/store";
import { validateSquad, validateLineup, transferCost } from "@/lib/fpl/squad";
import { upcomingGameweek } from "@/lib/fpl/gameweeks";
import type { GameweekLineup } from "@/lib/fpl/types";

export const dynamic = "force-dynamic";

// Change squad members for the upcoming gameweek. Transfers are counted against
// the squad as it entered this gameweek (a baseline snapshotted on first edit),
// so repeated edits don't double-count. The -4 hit is recorded and applied at
// scoring time.
export async function POST(request: Request) {
  const id = await resolvePlayerId(request).catch(() => null);
  if (!id) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });

  const upcoming = upcomingGameweek(Date.now());
  if (!upcoming) {
    return NextResponse.json({ ok: false, error: "No gameweek is open" }, { status: 400 });
  }

  let body: { squad?: unknown; lineup?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  if (!Array.isArray(body.squad) || !body.lineup) {
    return NextResponse.json({ ok: false, error: "Missing squad or lineup" }, { status: 400 });
  }
  const squad = body.squad as string[];
  const lineup = body.lineup as GameweekLineup;

  const team = await getTeam(id);
  if (!team) return NextResponse.json({ ok: false, error: "No team yet" }, { status: 404 });

  const lookup = poolLookup(await getPool());
  const sq = validateSquad(squad, lookup);
  if (!sq.ok) return NextResponse.json({ ok: false, error: sq.error }, { status: 400 });
  const ln = validateLineup(lineup, squad, lookup);
  if (!ln.ok) return NextResponse.json({ ok: false, error: ln.error }, { status: 400 });

  // Baseline = squad as it entered this gameweek; set once, then measured from.
  const baseline = team.baselineByGw?.[upcoming.id] ?? team.squad;
  const baselineSet = new Set(baseline);
  const transfers = squad.filter((pid) => !baselineSet.has(pid)).length;

  team.squad = squad;
  team.lineups = { ...team.lineups, [upcoming.id]: lineup };
  team.transfersByGw = { ...team.transfersByGw, [upcoming.id]: transfers };
  team.baselineByGw = { ...team.baselineByGw, [upcoming.id]: baseline };

  try {
    await saveTeam(team);
  } catch {
    return NextResponse.json({ ok: false, error: "KV error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, transfers, hit: transferCost(transfers) });
}
