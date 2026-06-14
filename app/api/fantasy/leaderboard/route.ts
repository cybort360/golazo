import { NextResponse } from "next/server";
import { computeOverallRows } from "@/lib/fpl/leaderboardServer";

export const dynamic = "force-dynamic";

// Public overall fantasy leaderboard, computed on demand.
export async function GET() {
  try {
    const rows = await computeOverallRows(Date.now());
    return NextResponse.json({ rows });
  } catch {
    return NextResponse.json({ rows: [] });
  }
}
