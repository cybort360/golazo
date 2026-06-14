import { NextResponse } from "next/server";
import { resolvePlayerId } from "@/lib/predictionStore";
import { getLeague, saveLeague, generateLeagueCode } from "@/lib/fpl/store";
import { gameweekById } from "@/lib/fpl/gameweeks";
import {
  validateLeagueName,
  validateEntryFee,
  DEFAULT_RAKE_BPS,
} from "@/lib/fpl/league";
import type { League } from "@/lib/fpl/types";

export const dynamic = "force-dynamic";

// Create a private league. The creator still joins (pays) separately.
export async function POST(request: Request) {
  const id = await resolvePlayerId(request).catch(() => null);
  if (!id) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });

  let body: { name?: unknown; entryFee?: unknown; startGw?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const nameCheck = validateLeagueName(body.name);
  if (!nameCheck.ok) return NextResponse.json({ ok: false, error: nameCheck.error }, { status: 400 });
  const feeCheck = validateEntryFee(body.entryFee);
  if (!feeCheck.ok) return NextResponse.json({ ok: false, error: feeCheck.error }, { status: 400 });

  const startGw = typeof body.startGw === "string" ? gameweekById(body.startGw) : undefined;
  if (!startGw) {
    return NextResponse.json({ ok: false, error: "Pick a valid start gameweek" }, { status: 400 });
  }
  if (startGw.deadlineMs <= Date.now()) {
    return NextResponse.json(
      { ok: false, error: "That gameweek has already started — pick a later one" },
      { status: 400 },
    );
  }

  // Find a free code (collisions are vanishingly rare; retry a few times).
  let code = generateLeagueCode();
  for (let i = 0; i < 5 && (await getLeague(code)); i++) code = generateLeagueCode();

  const league: League = {
    code,
    name: (body.name as string).trim(),
    creatorId: id,
    entryFee: body.entryFee as number,
    startGw: startGw.id,
    rakeBps: DEFAULT_RAKE_BPS,
    status: "open",
    members: [],
    createdAt: Date.now(),
  };

  try {
    await saveLeague(league);
  } catch {
    return NextResponse.json({ ok: false, error: "KV error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, code, league });
}
