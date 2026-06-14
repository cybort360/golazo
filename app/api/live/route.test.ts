// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ExternalMatch, LiveMatch } from "@/lib/resultsSync";
import type { MatchResult } from "@/hooks/useMatchResults";

// Shared, controllable test doubles for KV and the provider. Hoisted so the
// vi.mock factories below can reference them.
const h = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  failGet: false,
  fetch: vi.fn(),
}));

vi.mock("@vercel/kv", () => ({
  kv: {
    get: vi.fn(async (key: string) => {
      if (h.failGet) throw new Error("kv down");
      return h.store.has(key) ? h.store.get(key) : null;
    }),
    // Mimics Upstash: NX returns null when the key already exists, else "OK".
    set: vi.fn(async (key: string, value: unknown, opts?: { nx?: boolean }) => {
      if (opts?.nx && h.store.has(key)) return null;
      h.store.set(key, value);
      return "OK";
    }),
    del: vi.fn(async (key: string) => {
      h.store.delete(key);
    }),
  },
}));

// ESPN is the primary live source; football-data is the fallback. h.fetch is the
// primary so the existing assertions track the refresh path.
vi.mock("@/lib/espnLive", () => ({
  fetchWorldCupMatchesEspn: h.fetch,
}));
vi.mock("@/lib/footballData", () => ({
  fetchWorldCupMatches: vi.fn(async () => []),
}));

import { GET } from "@/app/api/live/route";

// GM001 = MEX v RSA kicks off 2026-06-11 19:00 UTC.
const IN_WINDOW = Date.UTC(2026, 5, 11, 19, 30, 0);
const OUT_OF_WINDOW = Date.UTC(2026, 0, 1, 0, 0, 0);

function finishedGM001(): ExternalMatch {
  return {
    stage: "GROUP_STAGE",
    group: "GROUP_A",
    utcDate: "2026-06-11T19:00:00Z",
    homeName: "Mexico",
    awayName: "South Africa",
    status: "finished",
    homeScore: 2,
    awayScore: 0,
    winner: "home",
  };
}

async function body(res: Response): Promise<{
  matches: LiveMatch[];
  fetchedAt: number;
  unmapped: number;
}> {
  return res.json();
}

beforeEach(() => {
  h.store.clear();
  h.failGet = false;
  h.fetch.mockReset();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("GET /api/live", () => {
  it("refreshes from the provider when stale and in a match window", async () => {
    vi.setSystemTime(new Date(IN_WINDOW));
    h.fetch.mockResolvedValue([finishedGM001()]);

    const data = await body(await GET());

    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(data.matches.map((m) => m.matchId)).toContain("GM001");
    // The finished match is merged into the canonical results store.
    const results = h.store.get("match_results") as MatchResult[];
    expect(results.find((r) => r.matchId === "GM001")?.winner).toBe("MEX");
    // The lock is released afterwards.
    expect(h.store.has("live_lock")).toBe(false);
  });

  it("does not call the provider outside any match window", async () => {
    vi.setSystemTime(new Date(OUT_OF_WINDOW));
    const data = await body(await GET());
    expect(h.fetch).not.toHaveBeenCalled();
    expect(data.matches).toHaveLength(0);
  });

  it("serves the existing snapshot without fetching when the lock is held", async () => {
    vi.setSystemTime(new Date(IN_WINDOW));
    h.store.set("live_lock", 1); // another worker is mid-refresh
    h.store.set("live_matches", {
      fetchedAt: 0, // stale, so a refresh would normally be attempted
      matches: [
        {
          matchId: "GM099",
          status: "live",
          homeTicker: "BRA",
          awayTicker: "ARG",
          homeScore: 1,
          awayScore: 1,
        },
      ],
      unmapped: 0,
    });

    const data = await body(await GET());

    expect(h.fetch).not.toHaveBeenCalled();
    expect(data.matches[0].matchId).toBe("GM099");
  });

  it("degrades to an empty payload when KV is unreachable", async () => {
    vi.setSystemTime(new Date(IN_WINDOW));
    h.failGet = true;
    const data = await body(await GET());
    expect(data.matches).toHaveLength(0);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it("serves a fresh snapshot from cache without re-fetching", async () => {
    vi.setSystemTime(new Date(IN_WINDOW));
    h.store.set("live_matches", {
      fetchedAt: IN_WINDOW - 1000, // 1s old → within the staleness window
      matches: [],
      unmapped: 0,
    });
    await body(await GET());
    expect(h.fetch).not.toHaveBeenCalled();
  });
});
