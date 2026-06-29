import { describe, it, expect } from "vitest";
import { MockTxlineClient } from "@/lib/txline/mock/client";
import { resolvePick, type MatchFinal } from "@/lib/predict/resolve";

const c = new MockTxlineClient();

// Bridge a TxLINE final result to the resolver input.
function toFinal(r: NonNullable<Awaited<ReturnType<typeof c.finalResult>>>): MatchFinal {
  return {
    state: r.state,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    goals: r.goals,
  };
}

describe("MockTxlineClient · fixtures + state", () => {
  it("serves the World Cup competition and fixtures", async () => {
    expect(await c.competitions()).toEqual(["World Cup 2026"]);
    const fx = await c.fixtures();
    expect(fx.length).toBeGreaterThanOrEqual(8);
    expect(fx.every((f) => f.competition === "World Cup 2026")).toBe(true);
  });

  it("derives live state with the visible score (England 1-0 at 67')", async () => {
    const s = await c.state("WC-B-ENG-GER");
    expect(s).toMatchObject({ state: "LIVE", minute: 67, homeScore: 1, awayScore: 0 });
  });

  it("hides scripted goals that haven't happened yet", async () => {
    // the 83' away goal must not be visible at minute 67
    const ev = await c.liveEvents("WC-B-ENG-GER");
    const goals = ev.filter((e) => e.type === "goal");
    expect(goals).toHaveLength(1);
    expect(goals[0].minute).toBe(40);
  });

  it("reports upcoming fixtures as NOT_STARTED with null score + no events", async () => {
    const s = await c.state("WC-C-BRA-FRA");
    expect(s).toMatchObject({ state: "NOT_STARTED", homeScore: null, awayScore: null });
    expect(await c.liveEvents("WC-C-BRA-FRA")).toHaveLength(0);
  });
});

describe("MockTxlineClient · append-only event log", () => {
  it("is monotonic and supports incremental reads via sinceSeq", async () => {
    const all = await c.liveEvents("WC-A-BRA-ARG");
    const seqs = all.map((e) => e.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length); // unique
    const tail = await c.liveEvents("WC-A-BRA-ARG", seqs[0]);
    expect(tail).toHaveLength(all.length - 1);
  });

  it("ends a finished match with an ft event and a void match with a void event", async () => {
    const ft = await c.liveEvents("WC-A-BRA-ARG");
    expect(ft.at(-1)).toMatchObject({ type: "ft", state: "FT" });
    const voided = await c.liveEvents("WC-C-POR-NED");
    expect(voided.at(-1)).toMatchObject({ type: "void", state: "VOID" });
  });
});

describe("MockTxlineClient · finalResult feeds the resolver", () => {
  it("returns null until a fixture is final", async () => {
    expect(await c.finalResult("WC-B-ENG-GER")).toBeNull(); // live
    expect(await c.finalResult("WC-C-BRA-FRA")).toBeNull(); // upcoming
  });

  it("BRA 2-1 ARG with an 87' winner resolves winner/totals/btts/chaos", async () => {
    const r = (await c.finalResult("WC-A-BRA-ARG"))!;
    expect(r).toMatchObject({ homeScore: 2, awayScore: 1, state: "FT" });
    const f = toFinal(r);
    expect(resolvePick(f, "winner", "home")).toBe("WON"); // BRA is home; settle maps ticker→home
    expect(resolvePick(f, "totals", "over")).toBe("WON"); // 3 goals
    expect(resolvePick(f, "btts", "yes")).toBe("WON");
    expect(resolvePick(f, "chaos", "yes")).toBe("WON"); // 87'
  });

  it("GER 3-0 NED is Over / BTTS-No / Chaos-Yes (90')", async () => {
    const r = (await c.finalResult("WC-D-GER-NED"))!;
    const f = toFinal(r);
    expect(resolvePick(f, "btts", "no")).toBe("WON");
    expect(resolvePick(f, "chaos", "yes")).toBe("WON");
    expect(r.stats.corners).toBe(7);
  });

  it("flags an unreliable stat as unavailable", async () => {
    const r = (await c.finalResult("WC-D-ESP-GER"))!;
    expect(r.available.corners).toBe(false);
    expect(r.available.total_goals).toBe(true);
  });

  it("surfaces a VOID final so settlement can void all markets", async () => {
    const r = (await c.finalResult("WC-C-POR-NED"))!;
    expect(r.state).toBe("VOID");
    expect(resolvePick(toFinal(r), "winner", "POR")).toBe("VOID");
  });
});
