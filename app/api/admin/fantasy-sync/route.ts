import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { fetchEspnPool } from "@/lib/espnSquads";
import { setPool } from "@/lib/fpl/store";

export const dynamic = "force-dynamic";

// Admin: (re)build the fantasy player pool from ESPN's free API and store it.
export async function POST() {
  if (!isAdminRequest()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const pool = await fetchEspnPool();
    if (pool.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Provider returned no players" },
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
