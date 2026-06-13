import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { SCHEDULE } from "@/constants/schedule";
import { TEAMS } from "@/constants/teams";
import { getKickoffMs } from "@/lib/schedule";
import { DRAW } from "@/lib/predictions";
import { picksKey, lockedKey, resolvePlayerId } from "@/lib/predictionStore";
import type { LiveMatch } from "@/lib/resultsSync";

export const dynamic = "force-dynamic";

const TICKERS = new Set(TEAMS.map((t) => t.ticker));
const FIXTURE_BY_ID = new Map(SCHEDULE.map((m) => [m.id, m]));

interface LiveSnapshot {
  matches?: LiveMatch[];
}

/**
 * The picks allowed for a fixture, or null if it isn't open for prediction yet.
 * Group fixtures (real tickers in the schedule) allow both teams + a draw.
 * Knockout fixtures carry placeholders until the bracket fills, so their teams
 * come from the live snapshot and there's no draw.
 */
async function allowedPicks(matchId: string): Promise<Set<string> | null> {
  const fixture = FIXTURE_BY_ID.get(matchId);
  if (!fixture) return null;

  if (TICKERS.has(fixture.teamA) && TICKERS.has(fixture.teamB)) {
    return new Set([fixture.teamA, fixture.teamB, DRAW]);
  }

  // Knockout: resolve participants from the live snapshot.
  const snapshot = await kv.get<LiveSnapshot>("live_matches");
  const live = snapshot?.matches?.find((m) => m.matchId === matchId);
  if (!live || !TICKERS.has(live.homeTicker) || !TICKERS.has(live.awayTicker)) {
    return null; // teams not known yet
  }
  return new Set([live.homeTicker, live.awayTicker]);
}

export async function POST(request: Request) {
  let body: { matchId?: unknown; pick?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  if (typeof body.matchId !== "string" || typeof body.pick !== "string") {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const fixture = FIXTURE_BY_ID.get(body.matchId);
  if (!fixture) {
    return NextResponse.json({ ok: false, error: "Unknown match" }, { status: 400 });
  }
  if (Date.now() >= getKickoffMs(fixture)) {
    return NextResponse.json(
      { ok: false, error: "Predictions are locked for this match" },
      { status: 409 },
    );
  }

  try {
    // Web (Bearer token) or Telegram (initData) — both resolve to a player id.
    const id = await resolvePlayerId(request);
    if (!id) {
      return NextResponse.json({ ok: false, error: "Not registered" }, { status: 401 });
    }

    // A locked pick can't be changed.
    const locked = (await kv.get<string[]>(lockedKey(id))) ?? [];
    if (locked.includes(body.matchId)) {
      return NextResponse.json(
        { ok: false, error: "This pick is locked" },
        { status: 409 },
      );
    }

    const allowed = await allowedPicks(body.matchId);
    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "This match isn't open for predictions yet" },
        { status: 409 },
      );
    }
    if (!allowed.has(body.pick)) {
      return NextResponse.json({ ok: false, error: "Invalid pick" }, { status: 400 });
    }

    const picks = (await kv.get<Record<string, string>>(picksKey(id))) ?? {};
    picks[body.matchId] = body.pick;
    await kv.set(picksKey(id), picks);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "KV error" }, { status: 500 });
  }
}
