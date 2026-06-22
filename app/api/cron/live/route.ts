import { NextResponse } from "next/server";
import { refreshLiveSnapshot } from "@/lib/liveRefresh";

// Heartbeat that refreshes live scores even when no one is on the site. Driven
// by an external pinger (see .github/workflows/live-refresh.yml) because Hobby
// Vercel Cron only fires daily — too coarse for in-play scores and finals. The
// public /api/live still serves the cached snapshot; this just keeps it fresh.
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // misconfigured: never an open refresh trigger
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function handle(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Always refresh — no kickoff-window gate. The pinger's interval is the
  // throttle, so a match finishing during dead hours still gets captured.
  const snapshot = await refreshLiveSnapshot(Date.now());
  if (!snapshot) {
    // Lock held by a concurrent refresh, or the provider failed; last snapshot
    // is untouched. Not an error from the pinger's point of view.
    return NextResponse.json({ ok: true, refreshed: false });
  }

  return NextResponse.json({
    ok: true,
    refreshed: true,
    fetchedAt: snapshot.fetchedAt,
    matches: snapshot.matches.length,
    unmapped: snapshot.unmapped,
  });
}

// POST is what the pinger uses; GET mirrors it so the endpoint can be triggered
// by hand (e.g. a one-off backfill) without crafting a POST.
export const GET = handle;
export const POST = handle;
