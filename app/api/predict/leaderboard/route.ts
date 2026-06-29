import { NextResponse } from "next/server";
import { globalLeaderboardUi } from "@/lib/predict/league";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, all-users global leaderboard (real DB).
export async function GET() {
  const board = await globalLeaderboardUi();
  if (!board) return NextResponse.json({ ok: false, board: null }, { status: 404 });
  return NextResponse.json({ ok: true, board });
}
