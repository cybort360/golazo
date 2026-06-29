import { describe, it, expect } from "vitest";
import { buildMatchProof, proofForStat, STAT_KEYS } from "@/lib/txline/proof";
import { hashLeaf, verifyProof } from "@/lib/txline/merkle";

const stats = {
  [STAT_KEYS.winner]: 0n,
  [STAT_KEYS.totals]: 1n,
  [STAT_KEYS.btts]: 1n,
  [STAT_KEYS.chaos]: 0n,
};

describe("txline proof", () => {
  it("produces a proof that verifies against the match root", () => {
    const matchId = "ABLRVR";
    const { claimedValue, proof, root } = proofForStat(matchId, stats, STAT_KEYS.winner);
    const leaf = hashLeaf(matchId, STAT_KEYS.winner, claimedValue);
    expect(verifyProof(leaf, proof, root)).toBe(true);
  });

  it("orders keys deterministically so the root is stable", () => {
    const a = buildMatchProof("M", stats).root;
    const b = buildMatchProof("M", { ...stats }).root;
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("throws on an unknown stat key", () => {
    expect(() => proofForStat("M", stats, "nope")).toThrow(/unknown stat/);
  });
});
