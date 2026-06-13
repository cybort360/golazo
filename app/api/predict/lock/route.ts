import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { SCHEDULE } from "@/constants/schedule";
import { picksKey, lockedKey, resolvePlayerId } from "@/lib/predictionStore";

export const dynamic = "force-dynamic";

const FIXTURE_BY_ID = new Map(SCHEDULE.map((m) => [m.id, m]));

// Permanently lock a player's pick for one match: it can't be changed after.
// Requires a pick to already exist for that match.
export async function POST(request: Request) {
  let body: { matchId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  if (typeof body.matchId !== "string") {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  if (!FIXTURE_BY_ID.has(body.matchId)) {
    return NextResponse.json({ ok: false, error: "Unknown match" }, { status: 400 });
  }

  try {
    const id = await resolvePlayerId(request);
    if (!id) {
      return NextResponse.json({ ok: false, error: "Not registered" }, { status: 401 });
    }

    const picks = (await kv.get<Record<string, string>>(picksKey(id))) ?? {};
    if (!picks[body.matchId]) {
      return NextResponse.json(
        { ok: false, error: "Make a pick before locking it" },
        { status: 400 },
      );
    }

    const locked = (await kv.get<string[]>(lockedKey(id))) ?? [];
    if (!locked.includes(body.matchId)) {
      await kv.set(lockedKey(id), [...locked, body.matchId]);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "KV error" }, { status: 500 });
  }
}
