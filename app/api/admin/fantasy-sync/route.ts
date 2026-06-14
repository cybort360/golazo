import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { fetchWorldCupPool } from "@/lib/footballDataSquads";
import { setPool } from "@/lib/fpl/store";

export const dynamic = "force-dynamic";

// Admin: (re)build the fantasy player pool from football-data.org and store it.
// Needs the Deep Data tier — on the free tier squads come back empty, so a
// count of 0 is the tell that the plan hasn't been upgraded yet.
export async function POST() {
  if (!isAdminRequest()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const pool = await fetchWorldCupPool();
    if (pool.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Provider returned no players (Deep Data tier active?)" },
        { status: 502 },
      );
    }
    await setPool(pool);
    return NextResponse.json({ ok: true, players: pool.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
