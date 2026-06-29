import { describe, it, expect } from "vitest";
import { sha256 } from "@noble/hashes/sha2.js";
import { hashLeaf, buildTree, proofFor, verifyProof, leafBytes, toHex } from "@/lib/txline/merkle";

const L = (m: string, k: string, v: bigint) => hashLeaf(m, k, v);

describe("merkle", () => {
  it("encodes a leaf with domain separation (0x00 prefix)", () => {
    const expected = sha256(Uint8Array.from([0x00, ...leafBytes("M", "k", 1n)]));
    expect(Array.from(hashLeaf("M", "k", 1n))).toEqual(Array.from(expected));
  });

  it("a single-leaf tree has root == that leaf", () => {
    const leaves = [L("M", "winner", 0n)];
    expect(Array.from(buildTree(leaves).root)).toEqual(Array.from(leaves[0]));
  });

  it("builds a root and verifies a valid proof for every leaf", () => {
    const leaves = [L("M", "winner", 0n), L("M", "total", 1n), L("M", "btts", 1n), L("M", "chaos", 0n)];
    const { root } = buildTree(leaves);
    leaves.forEach((leaf, i) => {
      const proof = proofFor(leaves, i);
      expect(verifyProof(leaf, proof, root)).toBe(true);
    });
  });

  it("verifies a valid proof in an odd-sized tree (promoted node)", () => {
    const leaves = [L("M", "winner", 0n), L("M", "total", 1n), L("M", "btts", 1n)];
    const { root } = buildTree(leaves);
    leaves.forEach((leaf, i) => {
      expect(verifyProof(leaf, proofFor(leaves, i), root)).toBe(true);
    });
  });

  it("rejects a tampered leaf", () => {
    const leaves = [L("M", "winner", 0n), L("M", "total", 1n), L("M", "btts", 1n)];
    const { root } = buildTree(leaves);
    const proof = proofFor(leaves, 0);
    expect(verifyProof(L("M", "winner", 9n), proof, root)).toBe(false);
  });

  it("toHex renders 32-byte hashes as 64 hex chars", () => {
    expect(toHex(L("M", "winner", 0n))).toHaveLength(64);
  });
});
