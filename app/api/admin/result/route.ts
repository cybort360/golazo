import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { isAdminRequest } from "@/lib/adminAuth";
import { broadcastPending } from "@/lib/broadcast";
import type { MatchResult } from "@/hooks/useMatchResults";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminRequest()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: Partial<MatchResult>;
  try {
    body = (await request.json()) as Partial<MatchResult>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  if (
    typeof body.matchId !== "string" ||
    typeof body.winner !== "string" ||
    typeof body.loser !== "string" ||
    typeof body.isDraw !== "boolean"
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid result" },
      { status: 400 },
    );
  }

  // Optional non-negative integer scores. Anything else is treated as absent.
  const score = (v: unknown): number | null =>
    typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;

  const result: MatchResult = {
    matchId: body.matchId,
    winner: body.winner,
    loser: body.loser,
    isDraw: body.isDraw,
    timestamp:
      typeof body.timestamp === "number" ? body.timestamp : Date.now(),
    goalsWinner: score(body.goalsWinner),
    goalsLoser: score(body.goalsLoser),
    // A result entered here is a human action and must survive API syncs.
    source: "manual",
  };

  try {
    const existing = (await kv.get<MatchResult[]>("match_results")) ?? [];
    // Replace any prior result for the same match, then append.
    const next = existing.filter((r) => r.matchId !== result.matchId);
    next.push(result);
    await kv.set("match_results", next);
    // Announce a newly-recorded result (no-op if Telegram is unconfigured).
    await broadcastPending();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "KV error" }, { status: 500 });
  }
}
