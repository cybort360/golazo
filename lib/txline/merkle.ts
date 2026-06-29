import { sha256 } from "@noble/hashes/sha2.js";

// Domain-separated, sorted-pair Merkle tree. The exact byte encoding here MUST
// match the Rust implementation in anchor/programs/txline_mock/src/lib.rs so a
// proof built in TypeScript verifies on-chain and vice-versa.
const LEAF_PREFIX = 0x00;
const NODE_PREFIX = 0x01;
const SEP = 0x1f; // unit separator between canonical leaf fields

function u64le(value: bigint): Uint8Array {
  const out = new Uint8Array(8);
  let v = value;
  for (let i = 0; i < 8; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function cmp(a: Uint8Array, b: Uint8Array): number {
  for (let i = 0; i < a.length && i < b.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

function hashNode(a: Uint8Array, b: Uint8Array): Uint8Array {
  const [lo, hi] = cmp(a, b) <= 0 ? [a, b] : [b, a];
  return sha256(concat(Uint8Array.from([NODE_PREFIX]), lo, hi));
}

export function toHex(b: Uint8Array): string {
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

// Canonical leaf bytes: utf8(matchId) 0x1f utf8(statKey) 0x1f u64_le(claimedValue)
export function leafBytes(matchId: string, statKey: string, claimedValue: bigint): Uint8Array {
  const enc = new TextEncoder();
  return concat(
    enc.encode(matchId),
    Uint8Array.from([SEP]),
    enc.encode(statKey),
    Uint8Array.from([SEP]),
    u64le(claimedValue),
  );
}

export function hashLeaf(matchId: string, statKey: string, claimedValue: bigint): Uint8Array {
  return sha256(concat(Uint8Array.from([LEAF_PREFIX]), leafBytes(matchId, statKey, claimedValue)));
}

export function buildTree(leaves: Uint8Array[]): { root: Uint8Array; layers: Uint8Array[][] } {
  if (leaves.length === 0) throw new Error("merkle: empty leaves");
  const layers: Uint8Array[][] = [leaves.slice()];
  while (layers[layers.length - 1].length > 1) {
    const prev = layers[layers.length - 1];
    const next: Uint8Array[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      if (i + 1 < prev.length) next.push(hashNode(prev[i], prev[i + 1]));
      else next.push(prev[i]); // odd node promoted unchanged
    }
    layers.push(next);
  }
  return { root: layers[layers.length - 1][0], layers };
}

export function proofFor(leaves: Uint8Array[], index: number): Uint8Array[] {
  const { layers } = buildTree(leaves);
  const proof: Uint8Array[] = [];
  let idx = index;
  for (let l = 0; l < layers.length - 1; l++) {
    const layer = layers[l];
    const sib = idx % 2 === 0 ? idx + 1 : idx - 1;
    if (sib < layer.length) proof.push(layer[sib]);
    idx = Math.floor(idx / 2);
  }
  return proof;
}

export function verifyProof(leaf: Uint8Array, proof: Uint8Array[], root: Uint8Array): boolean {
  let computed = leaf;
  for (const sib of proof) computed = hashNode(computed, sib);
  return cmp(computed, root) === 0;
}
