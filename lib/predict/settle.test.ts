import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Store } from "@/lib/predict/test-support/prismaMock";
import type { TxlineClient, TxlineFinalResult } from "@/lib/txline/client";

// Replace the DB client with the in-memory mock BEFORE importing settle.ts.
// The factory exposes the mutable store as `__store` so tests can seed rows.
vi.mock("@/lib/db/client", async () => {
  const { mockPrisma } = await import("@/lib/predict/test-support/prismaMock");
  const store = mockPrisma();
  return { prisma: store.prisma, __store: store };
});

import { settleFinished } from "@/lib/predict/settle";
import * as db from "@/lib/db/client";

const store = (db as unknown as { __store: Store }).__store;

function ftFinal(id: string, home: number, away: number): TxlineFinalResult {
  return {
    fixtureId: id,
    state: "FT",
    homeScore: home,
    awayScore: away,
    goals: [],
    stats: { home_goals: home, away_goals: away, total_goals: home + away, btts: home > 0 && away > 0 ? 1 : 0 },
    available: { home_goals: true, away_goals: true, total_goals: true, btts: true, late_goal: false },
    payloadRef: `fixture:${id}`,
    merkleRoot: null,
    settledAtMs: Date.now(),
  };
}

// A client whose fixtures() is deliberately EMPTY: settlement must NOT depend on
// the live fixtures list (finished matches drop off it — that was the bug).
function makeClient(finals: Record<string, TxlineFinalResult | null>): TxlineClient {
  return {
    mode: "mock",
    fixtures: vi.fn(async () => []),
    finalResult: vi.fn(async (id: string) => finals[id] ?? null),
    competitions: async () => [],
    fixture: async () => null,
    state: async () => null,
    liveEvents: async () => [],
  } as unknown as TxlineClient;
}

function pending(id: string, matchId: string, marketId: string, optionId: string, label: string) {
  store.predictions.push({
    id,
    userId: "u1",
    matchId,
    marketId,
    optionId,
    predictionLabel: label,
    status: "PENDING",
    points: 0,
    proofRef: null,
    settledAt: null,
  });
}

beforeEach(() => {
  store.predictions = [];
  store.matches = [];
  store.events = [];
  vi.clearAllMocks();
});

describe("settleFinished", () => {
  it("settles picks on a finished match even when it has dropped off fixtures() [regression]", async () => {
    // The match is FT but ABSENT from the live fixtures list.
    store.matches.push({ id: "DROPPED", homeTicker: "AAA", awayTicker: "BBB" });
    pending("p1", "DROPPED", "winner", "draw", "Draw"); // 1-1 → draw WON (40)

    const client = makeClient({ DROPPED: ftFinal("DROPPED", 1, 1) });
    const counts = await settleFinished(client);

    // fixtures() returns [] here — proving coverage does NOT come from it.
    expect(client.fixtures).not.toHaveBeenCalled();
    expect(counts).toMatchObject({ settled: 1, won: 1, lost: 0, void: 0 });

    const p = store.predictions.find((x) => x.id === "p1")!;
    expect(p.status).toBe("WON");
    expect(p.points).toBe(40);
    expect(p.settledAt).toBeInstanceOf(Date);
    expect(client.finalResult).toHaveBeenCalledWith("DROPPED");
  });

  it("settles every pending market on a finished match in one pass", async () => {
    store.matches.push({ id: "M", homeTicker: "HOM", awayTicker: "AWY" });
    pending("w", "M", "winner", "HOM", "Home"); // 2-0 → home WON (40)
    pending("t", "M", "totals", "under", "Under"); // 2 goals → under WON (30)
    pending("b", "M", "btts", "yes", "Yes"); // 2-0 → btts no → LOST (0)

    const counts = await settleFinished(makeClient({ M: ftFinal("M", 2, 0) }));

    expect(counts).toMatchObject({ settled: 3, won: 2, lost: 1 });
    expect(store.predictions.find((x) => x.id === "w")!.points).toBe(40);
    expect(store.predictions.find((x) => x.id === "t")!.points).toBe(30);
    expect(store.predictions.find((x) => x.id === "b")!.status).toBe("LOST");
  });

  it("leaves picks PENDING when the match has no final yet", async () => {
    store.matches.push({ id: "LIVE1", homeTicker: "AAA", awayTicker: "BBB" });
    pending("p1", "LIVE1", "winner", "draw", "Draw");

    const counts = await settleFinished(makeClient({ LIVE1: null }));

    expect(counts.settled).toBe(0);
    expect(store.predictions.find((x) => x.id === "p1")!.status).toBe("PENDING");
  });

  it("is idempotent — a second run settles nothing and preserves points", async () => {
    store.matches.push({ id: "M", homeTicker: "HOM", awayTicker: "AWY" });
    pending("p1", "M", "winner", "draw", "Draw");
    const client = makeClient({ M: ftFinal("M", 1, 1) });

    await settleFinished(client);
    const afterFirst = { ...store.predictions.find((x) => x.id === "p1")! };
    expect(afterFirst.status).toBe("WON");

    const counts2 = await settleFinished(client);
    expect(counts2.settled).toBe(0); // nothing PENDING remains
    expect(store.predictions.find((x) => x.id === "p1")!.points).toBe(afterFirst.points);
  });
});
