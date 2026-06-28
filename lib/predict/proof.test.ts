import { describe, it, expect } from "vitest";
import { parseStatKeys, buildPipeline, buildRawPayload } from "@/lib/predict/proof";
import type { ProofReceipt } from "@/lib/predict/types";

const ABL = { ticker: "ABL", name: "Albion", flagCode: "gb-eng", color: "#dc2626" };
const RVR = { ticker: "RVR", name: "Rovers", flagCode: "gb-eng", color: "#2563eb" };

const base: ProofReceipt = {
  pickId: "9f3a", predictionLabel: "Over 2.5 Goals", result: "WON",
  home: ABL, away: RVR, homeScore: 3, awayScore: 1, points: 50,
  fixtureId: "TXL-31-ABLRVR", matchState: "FT", marketLabel: "total_goals · O2.5",
  statKeys: "home_g=3, away_g=1", payloadRef: "0x9f3a…c41e",
  merkleStatus: "valid", onChainStatus: "valid",
  settledAtMs: Date.UTC(2026, 5, 28, 17, 42, 0), txUrl: "https://solscan.io/tx/9f3a",
};

describe("parseStatKeys", () => {
  it("splits key=value pairs and trims whitespace", () => {
    expect(parseStatKeys("home_g=3, away_g=1")).toEqual([
      { key: "home_g", value: "3" },
      { key: "away_g", value: "1" },
    ]);
  });
  it("returns an empty list for an empty string", () => {
    expect(parseStatKeys("")).toEqual([]);
  });
});

describe("buildPipeline", () => {
  it("marks all stages valid when fully attested on-chain", () => {
    const stages = buildPipeline(base);
    expect(stages.map((s) => s.id)).toEqual(["ingested", "settled", "attested", "on_chain"]);
    expect(stages.every((s) => s.status === "valid")).toBe(true);
  });
  it("marks attestation/on-chain pending when missing", () => {
    const stages = buildPipeline({ ...base, merkleStatus: null, onChainStatus: null });
    expect(stages.find((s) => s.id === "attested")?.status).toBe("pending");
    expect(stages.find((s) => s.id === "on_chain")?.status).toBe("pending");
  });
});

describe("buildRawPayload", () => {
  it("reconstructs inputs and attestation from the receipt", () => {
    const p = buildRawPayload(base) as Record<string, unknown>;
    expect(p.fixture_id).toBe("TXL-31-ABLRVR");
    expect(p.inputs).toEqual({ home_g: "3", away_g: "1" });
    expect((p.attestation as Record<string, unknown>).data_hash).toBe("0x9f3a…c41e");
    expect(p.settled_at_epoch_ms).toBe(base.settledAtMs);
  });
});
