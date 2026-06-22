import { kv } from "@vercel/kv";
import { SCHEDULE } from "@/constants/schedule";
import { getKickoffMs } from "@/lib/schedule";
import { fetchWorldCupMatches } from "@/lib/footballData";
import { fetchWorldCupMatchesEspn } from "@/lib/espnLive";
import {
  mapExternalMatches,
  mergeResults,
  type ExternalMatch,
  type LiveMatch,
} from "@/lib/resultsSync";
import { broadcastPending } from "@/lib/broadcast";
import type { MatchResult } from "@/hooks/useMatchResults";

export interface LiveSnapshot {
  fetchedAt: number;
  matches: LiveMatch[];
  unmapped: number;
}

// Serve the cached snapshot if it's younger than this; otherwise consider a
// refresh. Keeps provider calls to ~1/min even under heavy traffic.
export const STALE_MS = 45_000;
// Only poll the provider around kickoff windows so the free tier isn't spent on
// quiet hours: from 10 min before a kickoff to 3 h after.
const PRE_KICKOFF_MS = 10 * 60 * 1000;
const POST_KICKOFF_MS = 3 * 60 * 60 * 1000;
// Single-flight lock TTL — long enough to cover a provider round-trip.
const LOCK_MS = 10_000;

export const SNAPSHOT_KEY = "live_matches";
const LOCK_KEY = "live_lock";
const RESULTS_KEY = "match_results";

export function anyMatchInWindow(now: number): boolean {
  return SCHEDULE.some((m) => {
    const kickoff = getKickoffMs(m);
    return now >= kickoff - PRE_KICKOFF_MS && now <= kickoff + POST_KICKOFF_MS;
  });
}

/**
 * Fetch from the provider, map onto our fixtures, and persist the snapshot plus
 * any newly-finished results. Guarded by a KV lock so concurrent requests don't
 * stampede the free-tier rate limit. Returns the new snapshot, or null if the
 * lock was already held or the refresh failed.
 *
 * This does NOT gate on the kickoff window — callers decide whether to refresh.
 * The public route only calls it inside a window (to spare quiet hours); the
 * cron heartbeat calls it unconditionally so finals are captured even with no
 * site traffic.
 */
export async function refreshLiveSnapshot(
  now: number,
): Promise<LiveSnapshot | null> {
  // NX lock: only the first caller in this window proceeds.
  const gotLock = await kv.set(LOCK_KEY, now, { nx: true, px: LOCK_MS });
  if (gotLock !== "OK") return null;

  try {
    // ESPN's free scoreboard is near-real-time; football-data (delayed free
    // tier) is the fallback if ESPN is down or returns nothing.
    let external: ExternalMatch[] = [];
    try {
      external = await fetchWorldCupMatchesEspn();
    } catch {
      external = [];
    }
    if (external.length === 0) {
      external = await fetchWorldCupMatches();
    }
    const { live, finals, unmapped } = mapExternalMatches(external, now);

    const snapshot: LiveSnapshot = {
      fetchedAt: now,
      matches: live,
      unmapped: unmapped.length,
    };
    await kv.set(SNAPSHOT_KEY, snapshot);

    if (finals.length > 0) {
      const existing = (await kv.get<MatchResult[]>(RESULTS_KEY)) ?? [];
      const merged = mergeResults(existing, finals);
      await kv.set(RESULTS_KEY, merged);
      // Announce the freshly-finished matches (no-op if Telegram is unconfigured).
      await broadcastPending();
    }

    return snapshot;
  } catch {
    // Provider down / rate-limited / token missing: keep the last snapshot.
    return null;
  } finally {
    await kv.del(LOCK_KEY);
  }
}
