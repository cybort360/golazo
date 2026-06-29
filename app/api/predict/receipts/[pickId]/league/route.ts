import { NextResponse } from "next/server";
import { pickLeagueMovement } from "@/lib/predict/league";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Leaderboard-update moment for a settled pick: how it moved the current user in
// each of their private leagues (P2-13).
export async function GET(_req: Request, { params }: { params: { pickId: string } }) {
  const movements = await pickLeagueMovement(params.pickId);
  return NextResponse.json({ ok: true, movements });
}
