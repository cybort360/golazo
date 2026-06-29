import { describe, it, expect } from "vitest";
import {
  settlePhase,
  marketAvailable,
  availabilityMap,
  toMatchFinal,
  uiStatus,
} from "@/lib/predict/state";
import { resolvePick } from "@/lib/predict/resolve";
import type { TxlineFinalResult } from "@/lib/txline/client";

const finalFT: TxlineFinalResult = {
  fixtureId: "WC-A-BRA-ARG",
  state: "FT",
  homeScore: 2,
  awayScore: 1,
  goals: [
    { minute: 23, team: "home" },
    { minute: 58, team: "away" },
    { minute: 87, team: "home" },
  ],
  stats: { home_goals: 2, away_goals: 1, total_goals: 3, btts: 1, late_goal: 1, corners: 9 },
  available: { home_goals: true, away_goals: true, total_goals: true, btts: true, late_goal: true, corners: true },
  payloadRef: "txl_x",
  merkleRoot: null,
  settledAtMs: 0,
};

describe("settlePhase (PRD §9)", () => {
  it("settles on FT", () => expect(settlePhase("FT")).toBe("SETTLE"));
  it("voids on VOID (cancelled/abandoned)", () => expect(settlePhase("VOID")).toBe("VOID"));
  it("holds PENDING for postponed / suspended / in-play", () => {
    for (const s of ["NOT_STARTED", "LIVE", "HT", "SUSPENDED", "POSTPONED"] as const) {
      expect(settlePhase(s)).toBe("PENDING");
    }
  });
  it("settles a non-FT state only when an official final exists (abandoned-with-final)", () => {
    expect(settlePhase("SUSPENDED", true)).toBe("SETTLE");
    expect(settlePhase("POSTPONED", false)).toBe("PENDING");
  });
});

describe("market availability → per-market VOID", () => {
  it("all markets available when stats are reliable", () => {
    expect(availabilityMap(finalFT)).toEqual({ winner: true, totals: true, btts: true, chaos: true });
  });
  it("voids only the market whose required stat is unreliable", () => {
    const noBtts: TxlineFinalResult = { ...finalFT, available: { ...finalFT.available, btts: false } };
    expect(marketAvailable(noBtts, "btts")).toBe(false);
    expect(marketAvailable(noBtts, "winner")).toBe(true);
    // and the resolver respects it via the bridged map
    expect(resolvePick(toMatchFinal(noBtts, "BRA", "ARG"), "btts", "yes")).toBe("VOID");
    expect(resolvePick(toMatchFinal(noBtts, "BRA", "ARG"), "winner", "BRA")).toBe("WON");
  });
});

describe("toMatchFinal bridges TxLINE → resolver", () => {
  it("carries tickers so a ticker pick maps to home/away", () => {
    const f = toMatchFinal(finalFT, "BRA", "ARG");
    expect(resolvePick(f, "winner", "BRA")).toBe("WON");
    expect(resolvePick(f, "winner", "ARG")).toBe("LOST");
    expect(resolvePick(f, "chaos", "yes")).toBe("WON");
  });
});

describe("uiStatus", () => {
  it("formats LIVE with the minute", () => expect(uiStatus("LIVE", 67)).toBe("LIVE 67'"));
  it("maps terminal + special states", () => {
    expect(uiStatus("NOT_STARTED", null)).toBe("NOT STARTED");
    expect(uiStatus("FT", 90)).toBe("FT");
    expect(uiStatus("POSTPONED", null)).toBe("POSTPONED");
    expect(uiStatus("VOID", null)).toBe("VOID");
  });
});
