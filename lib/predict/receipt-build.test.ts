import { describe, it, expect } from "vitest";
import { buildReceipt, type ReceiptInput } from "@/lib/predict/receipt-build";
import type { MatchTeam } from "@/lib/predict/types";

const home: MatchTeam = { ticker: "BRA", name: "Brazil", flagCode: "br", color: "#FCD116" };
const away: MatchTeam = { ticker: "ARG", name: "Argentina", flagCode: "ar", color: "#75AADB" };

const base: ReceiptInput = {
  pickId: "p1",
  predictionLabel: "Goal after 80'",
  marketId: "chaos",
  optionId: "yes",
  status: "WON",
  points: 100,
  proofRef: "txl_WC-A-BRA-ARG_21",
  settledAtMs: 1234,
  matchState: "FT",
  homeScore: 2,
  awayScore: 1,
  home,
  away,
  fixtureId: "WC-A-BRA-ARG",
};

describe("buildReceipt", () => {
  it("maps a settled prediction to a ProofReceipt", () => {
    const r = buildReceipt(base);
    expect(r).toMatchObject({
      pickId: "p1",
      result: "WON",
      points: 100,
      homeScore: 2,
      awayScore: 1,
      marketLabel: "chaos · yes",
      statKeys: "home_g=2, away_g=1",
      payloadRef: "txl_WC-A-BRA-ARG_21",
      merkleStatus: "valid",
      onChainStatus: null,
    });
  });

  it("marks merkle unverified and uses a placeholder ref when no proof", () => {
    const r = buildReceipt({ ...base, proofRef: null });
    expect(r.merkleStatus).toBeNull();
    expect(r.payloadRef).toBe("-");
  });

  it("defaults null scores to 0 and tolerates an odd state", () => {
    const r = buildReceipt({ ...base, homeScore: null, awayScore: null, matchState: "weird" });
    expect([r.homeScore, r.awayScore]).toEqual([0, 0]);
    expect(r.matchState).toBe("FT");
  });
});
