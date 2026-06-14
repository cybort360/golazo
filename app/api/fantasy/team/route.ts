import { NextResponse } from "next/server";
import { resolvePlayerId } from "@/lib/predictionStore";
import { getPool, poolLookup, getTeam, saveTeam } from "@/lib/fpl/store";
import { validateSquad, validateLineup } from "@/lib/fpl/squad";
import { upcomingGameweek } from "@/lib/fpl/gameweeks";
import type { FplTeam, GameweekLineup } from "@/lib/fpl/types";

export const dynamic = "force-dynamic";

function validName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  return v.length >= 3 && v.length <= 30 ? v : null;
}

// Create the initial 15-player team + first-gameweek lineup. Changing an
// existing team goes through /lineup and /transfers.
export async function POST(request: Request) {
  const id = await resolvePlayerId(request).catch(() => null);
  if (!id) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });

  const upcoming = upcomingGameweek(Date.now());
  if (!upcoming) {
    return NextResponse.json({ ok: false, error: "The tournament is over" }, { status: 400 });
  }

  let body: { name?: unknown; squad?: unknown; lineup?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const name = validName(body.name);
  if (!name) {
    return NextResponse.json({ ok: false, error: "Team name must be 3–30 characters" }, { status: 400 });
  }
  if (!Array.isArray(body.squad) || !body.lineup) {
    return NextResponse.json({ ok: false, error: "Missing squad or lineup" }, { status: 400 });
  }
  const squad = body.squad as string[];
  const lineup = body.lineup as GameweekLineup;

  if (await getTeam(id)) {
    return NextResponse.json(
      { ok: false, error: "You already have a team — use transfers to change it" },
      { status: 409 },
    );
  }

  const lookup = poolLookup(await getPool());
  const sq = validateSquad(squad, lookup);
  if (!sq.ok) return NextResponse.json({ ok: false, error: sq.error }, { status: 400 });
  const ln = validateLineup(lineup, squad, lookup);
  if (!ln.ok) return NextResponse.json({ ok: false, error: ln.error }, { status: 400 });

  const team: FplTeam = {
    playerId: id,
    name,
    squad,
    createdAt: Date.now(),
    lineups: { [upcoming.id]: lineup },
    transfersByGw: {},
    baselineByGw: { [upcoming.id]: squad },
  };
  try {
    await saveTeam(team);
  } catch {
    return NextResponse.json({ ok: false, error: "KV error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, team });
}
