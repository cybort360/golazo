import { describe, it, expect } from "vitest";
import { decidePrediction, pointsFor } from "@/lib/predict/settle-decide";
import type { TxlineFinalResult } from "@/lib/txline/client";

const tickers = { home: "BRA", away: "ARG" };

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
  stats: { home_goals: 2, away_goals: 1, total_goals: 3, btts: 1, late_goal: 1 },
  available: { home_goals: true, away_goals: true, total_goals: true, btts: true, late_goal: true },
  payloadRef: "txl_WC-A-BRA-ARG_21",
  merkleRoot: null,
  settledAtMs: 0,
};

describe("pointsFor", () => {
  it("awards base points for a win and doubles chaos", () => {
    expect(pointsFor("WON", "winner")).toBe(40);
    expect(pointsFor("WON", "chaos")).toBe(100);
    expect(pointsFor("LOST", "chaos")).toBe(0);
    expect(pointsFor("VOID", "winner")).toBe(0);
  });
});

describe("decidePrediction", () => {
  it("returns null when no final has arrived (stay PENDING)", () => {
    expect(decidePrediction(null, "winner", "BRA", tickers)).toBeNull();
  });

  it("settles a winning home pick with points + proof ref", () => {
    const d = decidePrediction(finalFT, "winner", "BRA", tickers)!;
    expect(d).toEqual({ status: "WON", points: 40, proofRef: "txl_WC-A-BRA-ARG_21" });
  });

  it("settles a winning chaos pick at 2x", () => {
    expect(decidePrediction(finalFT, "chaos", "yes", tickers)).toMatchObject({ status: "WON", points: 100 });
  });

  it("settles a losing pick with 0 points", () => {
    expect(decidePrediction(finalFT, "winner", "ARG", tickers)).toMatchObject({ status: "LOST", points: 0 });
  });

  it("voids every market on a VOID final and restores (0 points)", () => {
    const voided: TxlineFinalResult = { ...finalFT, state: "VOID" };
    expect(decidePrediction(voided, "winner", "BRA", tickers)).toEqual({
      status: "VOID",
      points: 0,
      proofRef: finalFT.payloadRef,
    });
  });

  it("voids only a market whose stat is unavailable", () => {
    const noBtts: TxlineFinalResult = { ...finalFT, available: { ...finalFT.available, btts: false } };
    expect(decidePrediction(noBtts, "btts", "yes", tickers)).toMatchObject({ status: "VOID", points: 0 });
    expect(decidePrediction(noBtts, "winner", "BRA", tickers)).toMatchObject({ status: "WON" });
  });
});
