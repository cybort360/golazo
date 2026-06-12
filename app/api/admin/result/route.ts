import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { isAdminRequest } from "@/lib/adminAuth";
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

  const result: MatchResult = {
    matchId: body.matchId,
    winner: body.winner,
    loser: body.loser,
    isDraw: body.isDraw,
    timestamp:
      typeof body.timestamp === "number" ? body.timestamp : Date.now(),
    buybackTxUrl:
      typeof body.buybackTxUrl === "string" && body.buybackTxUrl.length > 0
        ? body.buybackTxUrl
        : null,
  };

  try {
    const existing = (await kv.get<MatchResult[]>("match_results")) ?? [];
    // Replace any prior result for the same match, then append.
    const next = existing.filter((r) => r.matchId !== result.matchId);
    next.push(result);
    await kv.set("match_results", next);

    // Recording a result retires the featured pin for that match: once a game
    // is decided the homepage advances past it anyway, so leaving the pin set
    // only stranded a finished game in the admin panel. Clearing it here means
    // logging the result is the single action that resolves the pin too.
    const pinned = await kv.get<string>("featured_match_id");
    if (pinned === result.matchId) {
      await kv.del("featured_match_id");
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "KV error" }, { status: 500 });
  }
}
