import { describe, it, expect } from "vitest";
import {
  validateSquad,
  validateLineup,
  transferCost,
  squadPrice,
  BUDGET,
} from "@/lib/fpl/squad";
import type { FplPlayer, GameweekLineup, Position } from "@/lib/fpl/types";

// Build a legal 15: 2 GK, 5 DEF, 5 MID, 3 FWD, cheap enough and spread across
// teams (≤3 per country).
const COMPOSITION: Position[] = [
  "GK", "GK",
  "DEF", "DEF", "DEF", "DEF", "DEF",
  "MID", "MID", "MID", "MID", "MID",
  "FWD", "FWD", "FWD",
];

function makePool(price = 5.0): { ids: string[]; lookup: (id: string) => FplPlayer | undefined } {
  const players: FplPlayer[] = COMPOSITION.map((position, i) => ({
    id: `p${i}`,
    name: `Player ${i}`,
    team: `T${Math.floor(i / 3)}`, // 3 per team → respects the cap
    position,
    price,
  }));
  const byId = new Map(players.map((p) => [p.id, p]));
  return { ids: players.map((p) => p.id), lookup: (id) => byId.get(id) };
}

describe("validateSquad", () => {
  it("accepts a legal squad", () => {
    const { ids, lookup } = makePool();
    expect(validateSquad(ids, lookup)).toEqual({ ok: true });
  });

  it("rejects the wrong size", () => {
    const { ids, lookup } = makePool();
    expect(validateSquad(ids.slice(0, 14), lookup).ok).toBe(false);
  });

  it("rejects a bad composition", () => {
    const { ids, lookup } = makePool();
    // swap a FWD slot for a 6th DEF by replacing the last id's lookup
    const extraDef: FplPlayer = { id: "x", name: "x", team: "TX", position: "DEF", price: 5 };
    const lk = (id: string) => (id === "x" ? extraDef : lookup(id));
    expect(validateSquad([...ids.slice(0, 14), "x"], lk).ok).toBe(false);
  });

  it("enforces the country cap", () => {
    const { ids, lookup } = makePool();
    // Force the first four into one team → exceeds max 3.
    const lk = (id: string) => {
      const p = lookup(id);
      if (!p) return undefined;
      return ["p0", "p1", "p2", "p3"].includes(id) ? { ...p, team: "SAME" } : p;
    };
    expect(validateSquad(ids, lk).ok).toBe(false);
  });

  it("enforces the budget", () => {
    const { ids, lookup } = makePool(10.0); // 15 × 10 = 150 > 100
    expect(squadPrice(ids, lookup)).toBeGreaterThan(BUDGET);
    expect(validateSquad(ids, lookup).ok).toBe(false);
  });
});

describe("validateLineup", () => {
  const { ids, lookup } = makePool();
  // ids: p0,p1 GK; p2..p6 DEF; p7..p11 MID; p12..p14 FWD
  const legal: GameweekLineup = {
    starters: ["p0", "p2", "p3", "p4", "p7", "p8", "p9", "p10", "p12", "p13", "p14"],
    bench: ["p1", "p5", "p6", "p11"],
    captain: "p12",
    viceCaptain: "p7",
  };

  it("accepts a legal 1-3-4-3 lineup", () => {
    expect(validateLineup(legal, ids, lookup)).toEqual({ ok: true });
  });

  it("rejects two goalkeepers in the XI", () => {
    const bad: GameweekLineup = {
      ...legal,
      starters: ["p0", "p1", "p3", "p4", "p7", "p8", "p9", "p12", "p13", "p14", "p2"],
      bench: ["p5", "p6", "p10", "p11"],
    };
    expect(validateLineup(bad, ids, lookup).ok).toBe(false);
  });

  it("rejects a captain who isn't a starter", () => {
    expect(validateLineup({ ...legal, captain: "p1" }, ids, lookup).ok).toBe(false);
  });

  it("rejects identical captain and vice", () => {
    expect(validateLineup({ ...legal, viceCaptain: "p12" }, ids, lookup).ok).toBe(false);
  });

  it("rejects a lineup that doesn't use the squad", () => {
    const bad = { ...legal, bench: ["p1", "p5", "p6", "zzz"] };
    expect(validateLineup(bad, ids, lookup).ok).toBe(false);
  });
});

describe("transferCost", () => {
  it("gives the first transfer free, then -4 each", () => {
    expect(transferCost(0)).toBe(0);
    expect(transferCost(1)).toBe(0);
    expect(transferCost(2)).toBe(4);
    expect(transferCost(4)).toBe(12);
  });
});
