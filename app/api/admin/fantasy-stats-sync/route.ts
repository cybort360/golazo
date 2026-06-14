import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { setMatchStats } from "@/lib/fpl/store";
import { mapFinishedFixturesToEspn } from "@/lib/espnEvents";
import { fetchEspnMatchStats } from "@/lib/espnMatchStats";
import { mapLimited } from "@/lib/espn";

export const dynamic = "force-dynamic";

// Admin one-click: map every played group-stage fixture to its ESPN event and
// pull + store the player stats. Re-runnable (overwrites with the latest).
// Knockout fixtures (placeholder teams) aren't auto-mapped — use the manual
// /api/admin/fantasy-stats with an espnEventId for those.
export async function POST() {
  if (!isAdminRequest()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const map = await mapFinishedFixturesToEspn(Date.now());
    const entries = Object.entries(map);

    let synced = 0;
    const failed: string[] = [];
    await mapLimited(entries, 5, async ([matchId, eventId]) => {
      try {
        const stats = await fetchEspnMatchStats(eventId);
        if (stats.length > 0) {
          await setMatchStats(matchId, stats);
          synced += 1;
        }
      } catch {
        failed.push(matchId);
      }
    });

    return NextResponse.json({ ok: true, mapped: entries.length, synced, failed });
  } catch {
    return NextResponse.json({ ok: false, error: "Sync failed" }, { status: 502 });
  }
}
