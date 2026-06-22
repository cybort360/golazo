import { kv } from "@vercel/kv";
import {
  anyMatchInWindow,
  refreshLiveSnapshot,
  STALE_MS,
  SNAPSHOT_KEY,
  type LiveSnapshot,
} from "@/lib/liveRefresh";

// Live scores are read every request and refreshed on demand; never prerender.
export const dynamic = "force-dynamic";

export async function GET() {
  const now = Date.now();

  let snapshot: LiveSnapshot | null = null;
  try {
    snapshot = await kv.get<LiveSnapshot>(SNAPSHOT_KEY);
  } catch {
    // KV unconfigured / unreachable: behave as if there's no live data.
    return Response.json({ matches: [], fetchedAt: 0, unmapped: 0 });
  }

  // Refresh on a visitor's request only inside a kickoff window — quiet-hour
  // page views shouldn't burn provider calls. The cron heartbeat covers the
  // gaps (a match that finishes with nobody on the site).
  const stale = !snapshot || now - snapshot.fetchedAt > STALE_MS;
  if (stale && anyMatchInWindow(now)) {
    const fresh = await refreshLiveSnapshot(now);
    if (fresh) snapshot = fresh;
  }

  return Response.json(
    snapshot ?? { matches: [], fetchedAt: 0, unmapped: 0 },
  );
}
