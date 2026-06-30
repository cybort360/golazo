import { NextResponse } from "next/server";
import { getTxlineClient } from "@/lib/txline";

// Consensus odds (implied probabilities) for a fixture, from the TxLINE odds
// feed. Null when none are posted (pre-market or unavailable on this tier).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { matchId: string } }) {
  const client = getTxlineClient();
  try {
    const odds = client.odds ? await client.odds(params.matchId) : null;
    return NextResponse.json({ ok: true, odds });
  } catch (e) {
    return NextResponse.json({ ok: false, odds: null, error: String((e as Error)?.message ?? e).slice(0, 200) });
  }
}
