import { NextResponse } from "next/server";
import { resolvePlayerId } from "@/lib/predictionStore";
import { getPool, poolLookup, getTeam, saveTeam } from "@/lib/fpl/store";
import { validateLineup } from "@/lib/fpl/squad";
import { upcomingGameweek } from "@/lib/fpl/gameweeks";
import type { GameweekLineup } from "@/lib/fpl/types";

export const dynamic = "force-dynamic";

// Set the starting XI / bench / captain for the upcoming gameweek. No squad
// change. Locks once that gameweek's deadline passes (upcomingGameweek only
// returns a gameweek whose deadline is still ahead).
export async function POST(request: Request) {
  const id = await resolvePlayerId(request).catch(() => null);
  if (!id) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });

  const upcoming = upcomingGameweek(Date.now());
  if (!upcoming) {
    return NextResponse.json({ ok: false, error: "No gameweek is open" }, { status: 400 });
  }

  let body: { lineup?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  if (!body.lineup) {
    return NextResponse.json({ ok: false, error: "Missing lineup" }, { status: 400 });
  }
  const lineup = body.lineup as GameweekLineup;

  const team = await getTeam(id);
  if (!team) return NextResponse.json({ ok: false, error: "No team yet" }, { status: 404 });

  const lookup = poolLookup(await getPool());
  const ln = validateLineup(lineup, team.squad, lookup);
  if (!ln.ok) return NextResponse.json({ ok: false, error: ln.error }, { status: 400 });

  team.lineups = { ...team.lineups, [upcoming.id]: lineup };
  try {
    await saveTeam(team);
  } catch {
    return NextResponse.json({ ok: false, error: "KV error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
