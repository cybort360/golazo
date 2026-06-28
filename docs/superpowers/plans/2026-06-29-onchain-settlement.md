# On-Chain Parimutuel Settlement + Real Wallet Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a real Solana devnet prediction-settlement system where users stake a custom SPL token into parimutuel pools that settle trustlessly via a Cross-Program Invocation into a `validate_stat` oracle, with Merkle-proof verification client-side and on-chain.

**Architecture:** A new `/anchor` workspace holds two programs — `txline_mock` (a `validate_stat` oracle stand-in that verifies Merkle proofs of match results) and `golazo_predict` (a parimutuel pool that CPIs into `txline_mock` to settle and pays winners pro-rata in a "GOLAZO points" SPL token). The Next.js app gains a real `@solana/wallet-adapter` integration, a typed Anchor client, an SSE live-match stream that triggers settlement, and a Merkle-verify panel. TxLINE is mocked but the interfaces are swap-ready.

**Tech Stack:** Anchor (Rust) + `anchor-spl`, Solana devnet, `@coral-xyz/anchor`, `@solana/web3.js`, `@solana/wallet-adapter-*`, `@solana/spl-token`, `@noble/hashes` (sha256), Next.js 14 App Router, TypeScript, vitest.

## Global Constraints

- **Network:** Solana **devnet** only. No mainnet, no real money.
- **Stake asset:** a custom "GOLAZO points" SPL token (decimals = 6). Never the TxLINE credit token; never SOL for stakes.
- **Settlement model:** parimutuel, **zero rake**. Losers' stake redistributes to winners pro-rata. Refund path when the winning bucket is empty.
- **Oracle:** `golazo_predict::settle` MUST settle via a real CPI into `txline_mock::validate_stat` — never by trusting an off-chain signer.
- **Merkle:** sorted-pair hashing with domain separation — `leaf = sha256(0x00 || canonical_bytes)`, `node = sha256(0x01 || min(a,b) || max(a,b))`. **Identical encoding in TS and Rust.** Canonical leaf bytes = `utf8(match_id) || 0x1f || utf8(stat_key) || 0x1f || u64_le(claimed_value)`.
- **No AI attribution** in any commit message; never add `Co-Authored-By`. Trunk-based on `main`.
- **Do not push to origin** — local commits only until the user says otherwise.
- **Keep the existing 117 vitest tests green** after every frontend task.
- **Anchor/program IDs + GOLAZO mint** are read from `NEXT_PUBLIC_*` env; never hard-coded in components.

---

## Phase 0 — Toolchain & workspace

### Task 1: Anchor toolchain + empty `/anchor` workspace builds

**Files:**
- Create: `anchor/Anchor.toml`
- Create: `anchor/Cargo.toml` (workspace)
- Create: `anchor/package.json` (anchor TS test deps)
- Modify: `.gitignore` (add `anchor/target`, `anchor/.anchor`, `anchor/test-ledger`)

**Interfaces:**
- Produces: a buildable Anchor workspace at `anchor/`; a funded devnet keypair at `~/.config/solana/id.json`.

- [ ] **Step 1: Put Solana + Anchor on PATH and pin versions**

Run:
```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana --version
avm install 0.30.1 && avm use 0.30.1
anchor --version
```
Expected: `solana-cli 1.18.x` (or installed version) and `anchor-cli 0.30.1`.
If `avm install 0.30.1` fails to compile against the installed Solana, run `avm list`, pick the newest installable version, and use that version string everywhere below.

- [ ] **Step 2: Create a devnet keypair and airdrop**

Run:
```bash
solana config set --url https://api.devnet.solana.com
[ -f ~/.config/solana/id.json ] || solana-keygen new --no-bip39-passphrase -o ~/.config/solana/id.json
solana airdrop 5 || (sleep 20 && solana airdrop 2)
solana balance
```
Expected: a balance ≥ 2 SOL on devnet. If the faucet rate-limits, retry or use `https://faucet.solana.com`.

- [ ] **Step 3: Scaffold the workspace**

Run:
```bash
cd /Users/HideOut/Documents/golazo
anchor init anchor --no-git
cd anchor
rm -rf programs/anchor   # remove the default program; we add our own in later tasks
```
Then create `anchor/Anchor.toml`:
```toml
[toolchain]
anchor_version = "0.30.1"

[features]
resolution = true
skip-lint = false

[programs.devnet]
txline_mock = "11111111111111111111111111111111"
golazo_predict = "11111111111111111111111111111111"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```
(The two program IDs are placeholders until Task 10 replaces them with real deploy keys.)

- [ ] **Step 4: Ignore build artifacts**

Add to `.gitignore`:
```
anchor/target
anchor/.anchor
anchor/test-ledger
anchor/node_modules
```

- [ ] **Step 5: Verify the empty workspace builds**

Run: `cd anchor && anchor build`
Expected: build succeeds (no programs yet, or only stubs). If `anchor init` left a stub program, `anchor build` succeeds with it; that's fine — it's removed/replaced in Task 3+.

- [ ] **Step 6: Commit**

```bash
cd /Users/HideOut/Documents/golazo
git add anchor .gitignore
git commit -m "Scaffold Anchor devnet workspace for on-chain settlement"
```

---

## Phase 1 — Merkle library (TS source of truth)

### Task 2: TS Merkle lib with build/proof/verify

**Files:**
- Create: `lib/txline/merkle.ts`
- Test: `lib/txline/merkle.test.ts`

**Interfaces:**
- Produces:
  - `leafBytes(matchId: string, statKey: string, claimedValue: bigint): Uint8Array`
  - `hashLeaf(matchId: string, statKey: string, claimedValue: bigint): Uint8Array` (32 bytes)
  - `buildTree(leaves: Uint8Array[]): { root: Uint8Array; layers: Uint8Array[][] }`
  - `proofFor(leaves: Uint8Array[], index: number): Uint8Array[]` (sibling hashes, bottom→up)
  - `verifyProof(leaf: Uint8Array, proof: Uint8Array[], root: Uint8Array): boolean`
  - `toHex(b: Uint8Array): string`

- [ ] **Step 1: Add the hashing dependency**

Run: `npm i @noble/hashes`
Expected: installs; `package.json` updated.

- [ ] **Step 2: Write the failing test**

Create `lib/txline/merkle.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { sha256 } from "@noble/hashes/sha256";
import { hashLeaf, buildTree, proofFor, verifyProof, leafBytes } from "@/lib/txline/merkle";

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

  it("rejects a tampered leaf", () => {
    const leaves = [L("M", "winner", 0n), L("M", "total", 1n), L("M", "btts", 1n)];
    const { root } = buildTree(leaves);
    const proof = proofFor(leaves, 0);
    expect(verifyProof(L("M", "winner", 9n), proof, root)).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/txline/merkle.test.ts`
Expected: FAIL — module `@/lib/txline/merkle` not found.

- [ ] **Step 4: Implement the library**

Create `lib/txline/merkle.ts`:
```ts
import { sha256 } from "@noble/hashes/sha256";

const LEAF_PREFIX = 0x00;
const NODE_PREFIX = 0x01;
const SEP = 0x1f; // unit separator between canonical fields

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
  for (const p of parts) { out.set(p, o); o += p.length; }
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
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function leafBytes(matchId: string, statKey: string, claimedValue: bigint): Uint8Array {
  const enc = new TextEncoder();
  return concat(enc.encode(matchId), Uint8Array.from([SEP]), enc.encode(statKey), Uint8Array.from([SEP]), u64le(claimedValue));
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
      else next.push(prev[i]); // odd node promoted
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/txline/merkle.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/txline/merkle.ts lib/txline/merkle.test.ts package.json package-lock.json
git commit -m "Add Merkle proof lib (sorted-pair, domain-separated) for TxLINE verification"
```

---

### Task 3: TxLINE proof fixtures + match-result encoding helper

**Files:**
- Create: `lib/txline/proof.ts`
- Test: `lib/txline/proof.test.ts`

**Interfaces:**
- Consumes: `lib/txline/merkle.ts`.
- Produces:
  - `STAT_KEYS = { winner: "winner", totals: "total_goals_over25", btts: "btts", chaos: "goal_after_80" }` (const)
  - `buildMatchProof(matchId: string, stats: Record<string,bigint>): { root: Uint8Array; leaves: Uint8Array[]; orderedKeys: string[] }`
  - `proofForStat(matchId: string, stats: Record<string,bigint>, statKey: string): { claimedValue: bigint; proof: Uint8Array[]; root: Uint8Array }`

- [ ] **Step 1: Write the failing test**

Create `lib/txline/proof.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildMatchProof, proofForStat, STAT_KEYS } from "@/lib/txline/proof";
import { hashLeaf, verifyProof } from "@/lib/txline/merkle";

const stats = { [STAT_KEYS.winner]: 0n, [STAT_KEYS.totals]: 1n, [STAT_KEYS.btts]: 1n, [STAT_KEYS.chaos]: 0n };

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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/txline/proof.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `lib/txline/proof.ts`:
```ts
import { hashLeaf, buildTree, proofFor } from "@/lib/txline/merkle";

export const STAT_KEYS = {
  winner: "winner",            // claimedValue: 0=home,1=draw,2=away
  totals: "total_goals_over25", // 1=over,0=under
  btts: "btts",                 // 1=yes,0=no
  chaos: "goal_after_80",       // 1=yes,0=no
} as const;

function ordered(stats: Record<string, bigint>): string[] {
  return Object.keys(stats).sort();
}

export function buildMatchProof(matchId: string, stats: Record<string, bigint>) {
  const orderedKeys = ordered(stats);
  const leaves = orderedKeys.map((k) => hashLeaf(matchId, k, stats[k]));
  const { root } = buildTree(leaves);
  return { root, leaves, orderedKeys };
}

export function proofForStat(matchId: string, stats: Record<string, bigint>, statKey: string) {
  const orderedKeys = ordered(stats);
  const idx = orderedKeys.indexOf(statKey);
  if (idx === -1) throw new Error(`txline proof: unknown stat ${statKey}`);
  const leaves = orderedKeys.map((k) => hashLeaf(matchId, k, stats[k]));
  const { root } = buildTree(leaves);
  return { claimedValue: stats[statKey], proof: proofFor(leaves, idx), root };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/txline/proof.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/txline/proof.ts lib/txline/proof.test.ts
git commit -m "Add TxLINE match-proof builder (stable stat ordering)"
```

---

## Phase 2 — `txline_mock` program

### Task 4: `txline_mock` program — `post_root` + `validate_stat`

**Files:**
- Create: `anchor/programs/txline_mock/Cargo.toml`
- Create: `anchor/programs/txline_mock/src/lib.rs`
- Create: `anchor/tests/txline_mock.ts`
- Modify: `anchor/Anchor.toml` (program entry already present)

**Interfaces:**
- Produces (CPI target for Task 8):
  - `post_root(ctx, match_id: String, root: [u8;32])` → writes `MatchRoot { match_id, root }`
  - `validate_stat(ctx, match_id: String, stat_key: String, claimed_value: u64, proof: Vec<[u8;32]>)` → errors unless the recomputed root equals the stored `MatchRoot.root`.
  - `MatchRoot` PDA seeds: `[b"root", match_id.as_bytes()]`.
  - Leaf/node hashing identical to `lib/txline/merkle.ts`.

> Signature verification of the root is intentionally out of scope for the mock (the demo oracle authority is the `post_root` signer). The real TxLINE swap adds on-chain signature checks; the CPI shape stays the same.

- [ ] **Step 1: Create the program crate**

Create `anchor/programs/txline_mock/Cargo.toml`:
```toml
[package]
name = "txline_mock"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "txline_mock"

[features]
no-entrypoint = []
cpi = ["no-entrypoint"]
default = []

[dependencies]
anchor-lang = "0.30.1"
```

- [ ] **Step 2: Write the program (with Merkle verify matching the TS lib)**

Create `anchor/programs/txline_mock/src/lib.rs`:
```rust
use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

declare_id!("11111111111111111111111111111111");

const LEAF_PREFIX: u8 = 0x00;
const NODE_PREFIX: u8 = 0x01;
const SEP: u8 = 0x1f;

fn leaf_hash(match_id: &str, stat_key: &str, claimed_value: u64) -> [u8; 32] {
    let mut bytes = vec![LEAF_PREFIX];
    bytes.extend_from_slice(match_id.as_bytes());
    bytes.push(SEP);
    bytes.extend_from_slice(stat_key.as_bytes());
    bytes.push(SEP);
    bytes.extend_from_slice(&claimed_value.to_le_bytes());
    hash(&bytes).to_bytes()
}

fn hash_node(a: &[u8; 32], b: &[u8; 32]) -> [u8; 32] {
    let (lo, hi) = if a <= b { (a, b) } else { (b, a) };
    let mut bytes = vec![NODE_PREFIX];
    bytes.extend_from_slice(lo);
    bytes.extend_from_slice(hi);
    hash(&bytes).to_bytes()
}

fn compute_root(leaf: [u8; 32], proof: &[[u8; 32]]) -> [u8; 32] {
    let mut computed = leaf;
    for sib in proof {
        computed = hash_node(&computed, sib);
    }
    computed
}

#[program]
pub mod txline_mock {
    use super::*;

    pub fn post_root(ctx: Context<PostRoot>, match_id: String, root: [u8; 32]) -> Result<()> {
        let mr = &mut ctx.accounts.match_root;
        mr.match_id = match_id;
        mr.root = root;
        mr.oracle = ctx.accounts.oracle.key();
        Ok(())
    }

    pub fn validate_stat(
        ctx: Context<ValidateStat>,
        match_id: String,
        stat_key: String,
        claimed_value: u64,
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        require!(ctx.accounts.match_root.match_id == match_id, TxlineError::MatchMismatch);
        let leaf = leaf_hash(&match_id, &stat_key, claimed_value);
        let computed = compute_root(leaf, &proof);
        require!(computed == ctx.accounts.match_root.root, TxlineError::InvalidProof);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct PostRoot<'info> {
    #[account(mut)]
    pub oracle: Signer<'info>,
    #[account(
        init_if_needed,
        payer = oracle,
        space = 8 + MatchRoot::SPACE,
        seeds = [b"root", match_id.as_bytes()],
        bump
    )]
    pub match_root: Account<'info, MatchRoot>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct ValidateStat<'info> {
    #[account(seeds = [b"root", match_id.as_bytes()], bump)]
    pub match_root: Account<'info, MatchRoot>,
}

#[account]
pub struct MatchRoot {
    pub match_id: String,
    pub root: [u8; 32],
    pub oracle: Pubkey,
}
impl MatchRoot {
    pub const SPACE: usize = (4 + 32) + 32 + 32;
}

#[error_code]
pub enum TxlineError {
    #[msg("match id mismatch")] MatchMismatch,
    #[msg("invalid merkle proof")] InvalidProof,
}
```

- [ ] **Step 3: Write the failing TS test (parity: TS proof verifies on-chain)**

Create `anchor/tests/txline_mock.ts`:
```ts
import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { buildMatchProof, proofForStat, STAT_KEYS } from "../../lib/txline/proof";
import { toHex } from "../../lib/txline/merkle";

describe("txline_mock", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.TxlineMock as anchor.Program;

  const matchId = "ABLRVR";
  const stats = { [STAT_KEYS.winner]: 0n, [STAT_KEYS.totals]: 1n, [STAT_KEYS.btts]: 1n, [STAT_KEYS.chaos]: 0n };

  const arr = (u: Uint8Array) => Array.from(u);

  it("posts a root and validates a correct stat proof", async () => {
    const { root } = buildMatchProof(matchId, stats);
    const [rootPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("root"), Buffer.from(matchId)], program.programId);

    await program.methods.postRoot(matchId, arr(root)).accounts({
      oracle: provider.wallet.publicKey, matchRoot: rootPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();

    const { claimedValue, proof } = proofForStat(matchId, stats, STAT_KEYS.winner);
    await program.methods.validateStat(
      matchId, STAT_KEYS.winner, new anchor.BN(claimedValue.toString()), proof.map(arr)
    ).accounts({ matchRoot: rootPda }).rpc();
  });

  it("rejects a tampered claimed value", async () => {
    const [rootPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("root"), Buffer.from(matchId)], program.programId);
    const { proof } = proofForStat(matchId, stats, STAT_KEYS.winner);
    try {
      await program.methods.validateStat(
        matchId, STAT_KEYS.winner, new anchor.BN(2), proof.map(arr) // wrong value
      ).accounts({ matchRoot: rootPda }).rpc();
      assert.fail("should have thrown");
    } catch (e: any) {
      assert.include(e.toString(), "InvalidProof");
    }
  });
});
```

- [ ] **Step 4: Build and run the local test**

Run:
```bash
cd anchor && anchor test
```
Expected: `txline_mock` builds; both tests pass. If `anchor.workspace.TxlineMock` is undefined, confirm the program name in `Anchor.toml` `[programs.devnet]` matches `txline_mock` and rebuild.

- [ ] **Step 5: Commit**

```bash
cd /Users/HideOut/Documents/golazo
git add anchor/programs/txline_mock anchor/tests/txline_mock.ts
git commit -m "Add txline_mock program: post_root + validate_stat (Merkle verify, TS parity)"
```

---

## Phase 3 — `golazo_predict` program

### Task 5: `golazo_predict` scaffold + GOLAZO mint + `faucet`

**Files:**
- Create: `anchor/programs/golazo_predict/Cargo.toml`
- Create: `anchor/programs/golazo_predict/src/lib.rs`
- Create: `anchor/tests/golazo_predict.ts`

**Interfaces:**
- Produces:
  - GOLAZO mint created by `init_mint(ctx)` with **mint authority = PDA** seeds `[b"mint_auth"]`.
  - `faucet(ctx, amount: u64)` mints `amount` GOLAZO to the caller's ATA (devnet free tokens).
  - Constant `GOLAZO_DECIMALS = 6`.

- [ ] **Step 1: Create the crate with anchor-spl**

Create `anchor/programs/golazo_predict/Cargo.toml`:
```toml
[package]
name = "golazo_predict"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "golazo_predict"

[features]
no-entrypoint = []
cpi = ["no-entrypoint"]
default = []

[dependencies]
anchor-lang = "0.30.1"
anchor-spl = "0.30.1"
txline_mock = { path = "../txline_mock", features = ["cpi"] }
```

- [ ] **Step 2: Write the program with mint + faucet**

Create `anchor/programs/golazo_predict/src/lib.rs`:
```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("11111111111111111111111111111111");

pub const GOLAZO_DECIMALS: u8 = 6;

#[program]
pub mod golazo_predict {
    use super::*;

    pub fn init_mint(_ctx: Context<InitMint>) -> Result<()> {
        Ok(())
    }

    pub fn faucet(ctx: Context<Faucet>, amount: u64) -> Result<()> {
        let bump = ctx.bumps.mint_authority;
        let seeds: &[&[u8]] = &[b"mint_auth", &[bump]];
        let signer = &[seeds];
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.user_ata.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitMint<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: PDA mint authority
    #[account(seeds = [b"mint_auth"], bump)]
    pub mint_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        mint::decimals = GOLAZO_DECIMALS,
        mint::authority = mint_authority,
        seeds = [b"golazo_mint"],
        bump
    )]
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Faucet<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [b"golazo_mint"], bump)]
    pub mint: Account<'info, Mint>,
    /// CHECK: PDA mint authority
    #[account(seeds = [b"mint_auth"], bump)]
    pub mint_authority: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user
    )]
    pub user_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
```

- [ ] **Step 3: Write the failing test (init mint + faucet mints tokens)**

Create `anchor/tests/golazo_predict.ts`:
```ts
import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

describe("golazo_predict: mint + faucet", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.GolazoPredict as anchor.Program;

  const [mint] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("golazo_mint")], program.programId);
  const [mintAuth] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("mint_auth")], program.programId);

  it("initializes the GOLAZO mint", async () => {
    await program.methods.initMint().accounts({
      payer: provider.wallet.publicKey, mintAuthority: mintAuth, mint,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    }).rpc();
  });

  it("faucets GOLAZO to the caller", async () => {
    const ata = getAssociatedTokenAddressSync(mint, provider.wallet.publicKey);
    await program.methods.faucet(new anchor.BN(1_000_000_000)).accounts({
      user: provider.wallet.publicKey, mint, mintAuthority: mintAuth, userAta: ata,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();
    const bal = await provider.connection.getTokenAccountBalance(ata);
    assert.equal(bal.value.amount, "1000000000");
  });
});
```

- [ ] **Step 4: Add JS deps for tests and run**

Run:
```bash
cd anchor && yarn add @solana/spl-token && anchor test
```
Expected: `golazo_predict` builds; mint + faucet tests pass (alongside the txline_mock tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/HideOut/Documents/golazo
git add anchor/programs/golazo_predict anchor/tests/golazo_predict.ts anchor/package.json anchor/yarn.lock
git commit -m "Add golazo_predict: GOLAZO mint (PDA authority) + faucet"
```

---

### Task 6: `init_pool` + `stake`

**Files:**
- Modify: `anchor/programs/golazo_predict/src/lib.rs`
- Modify: `anchor/tests/golazo_predict.ts`

**Interfaces:**
- Produces:
  - `init_pool(ctx, match_id: String, market_id: String, num_outcomes: u8, lock_ts: i64)` → `Pool` PDA `[b"pool", match_id, market_id]` + vault token account `[b"vault", pool]`.
  - `stake(ctx, outcome: u8, amount: u64)` → `Position` PDA `[b"pos", pool, user]`; transfers GOLAZO user_ata→vault; rejects when `clock.unix_timestamp >= lock_ts` (`PoolLocked`) or `outcome >= num_outcomes` (`BadOutcome`).
  - `Pool { match_id, market_id, num_outcomes, lock_ts, status: u8, winning_outcome: u8, total_staked: u64, outcome_totals: [u64; 8], mint, vault, bump }`.
  - `Position { pool, user, outcome, amount, claimed: bool }`.
  - status: 0=Open, 1=Settled.

- [ ] **Step 1: Add Pool/Position state + instructions**

In `anchor/programs/golazo_predict/src/lib.rs`, add inside `#[program]`:
```rust
    pub fn init_pool(
        ctx: Context<InitPool>,
        match_id: String,
        market_id: String,
        num_outcomes: u8,
        lock_ts: i64,
    ) -> Result<()> {
        require!(num_outcomes >= 2 && num_outcomes <= 8, GolazoError::BadOutcome);
        let pool = &mut ctx.accounts.pool;
        pool.match_id = match_id;
        pool.market_id = market_id;
        pool.num_outcomes = num_outcomes;
        pool.lock_ts = lock_ts;
        pool.status = 0;
        pool.winning_outcome = 0;
        pool.total_staked = 0;
        pool.outcome_totals = [0u64; 8];
        pool.mint = ctx.accounts.mint.key();
        pool.vault = ctx.accounts.vault.key();
        pool.bump = ctx.bumps.pool;
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, outcome: u8, amount: u64) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        require!(pool.status == 0, GolazoError::PoolClosed);
        require!(outcome < pool.num_outcomes, GolazoError::BadOutcome);
        let now = Clock::get()?.unix_timestamp;
        require!(now < pool.lock_ts, GolazoError::PoolLocked);
        require!(amount > 0, GolazoError::ZeroAmount);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.user_ata.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        let pos = &mut ctx.accounts.position;
        if pos.amount == 0 {
            pos.pool = pool.key();
            pos.user = ctx.accounts.user.key();
            pos.outcome = outcome;
            pos.claimed = false;
        } else {
            require!(pos.outcome == outcome, GolazoError::OutcomeConflict);
        }
        pos.amount = pos.amount.checked_add(amount).unwrap();
        pool.total_staked = pool.total_staked.checked_add(amount).unwrap();
        pool.outcome_totals[outcome as usize] =
            pool.outcome_totals[outcome as usize].checked_add(amount).unwrap();
        Ok(())
    }
```
Add account contexts + state + errors (append to file):
```rust
#[derive(Accounts)]
#[instruction(match_id: String, market_id: String)]
pub struct InitPool<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(seeds = [b"golazo_mint"], bump)]
    pub mint: Account<'info, Mint>,
    #[account(
        init, payer = creator, space = 8 + Pool::SPACE,
        seeds = [b"pool", match_id.as_bytes(), market_id.as_bytes()], bump
    )]
    pub pool: Account<'info, Pool>,
    #[account(
        init, payer = creator,
        token::mint = mint, token::authority = pool,
        seeds = [b"vault", pool.key().as_ref()], bump
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds = [b"pool", pool.match_id.as_bytes(), pool.market_id.as_bytes()], bump = pool.bump)]
    pub pool: Account<'info, Pool>,
    #[account(mut, seeds = [b"vault", pool.key().as_ref()], bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_ata: Account<'info, TokenAccount>,
    #[account(
        init_if_needed, payer = user, space = 8 + Position::SPACE,
        seeds = [b"pos", pool.key().as_ref(), user.key().as_ref()], bump
    )]
    pub position: Account<'info, Position>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Pool {
    pub match_id: String,
    pub market_id: String,
    pub num_outcomes: u8,
    pub lock_ts: i64,
    pub status: u8,
    pub winning_outcome: u8,
    pub total_staked: u64,
    pub outcome_totals: [u64; 8],
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub bump: u8,
}
impl Pool {
    pub const SPACE: usize = (4+32) + (4+16) + 1 + 8 + 1 + 1 + 8 + (8*8) + 32 + 32 + 1;
}

#[account]
pub struct Position {
    pub pool: Pubkey,
    pub user: Pubkey,
    pub outcome: u8,
    pub amount: u64,
    pub claimed: bool,
}
impl Position {
    pub const SPACE: usize = 32 + 32 + 1 + 8 + 1;
}

#[error_code]
pub enum GolazoError {
    #[msg("bad outcome index")] BadOutcome,
    #[msg("pool is locked")] PoolLocked,
    #[msg("pool already settled/closed")] PoolClosed,
    #[msg("zero amount")] ZeroAmount,
    #[msg("position outcome conflict")] OutcomeConflict,
    #[msg("not settled")] NotSettled,
    #[msg("already claimed")] AlreadyClaimed,
    #[msg("not a winner")] NotWinner,
}
```

- [ ] **Step 2: Add the failing test (stake updates totals; lock rejects)**

Append to `anchor/tests/golazo_predict.ts`:
```ts
describe("golazo_predict: pool + stake", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.GolazoPredict as anchor.Program;
  const matchId = "ABLRVR", marketId = "winner";
  const [mint] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("golazo_mint")], program.programId);
  const pool = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), Buffer.from(matchId), Buffer.from(marketId)], program.programId)[0];
  const vault = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), pool.toBuffer()], program.programId)[0];

  it("creates a pool and accepts a stake", async () => {
    const lock = Math.floor(Date.now()/1000) + 3600;
    await program.methods.initPool(matchId, marketId, 3, new anchor.BN(lock)).accounts({
      creator: provider.wallet.publicKey, mint, pool, vault,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId, rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    }).rpc();

    const ata = getAssociatedTokenAddressSync(mint, provider.wallet.publicKey);
    const position = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pos"), pool.toBuffer(), provider.wallet.publicKey.toBuffer()], program.programId)[0];
    await program.methods.stake(0, new anchor.BN(100_000_000)).accounts({
      user: provider.wallet.publicKey, pool, vault, userAta: ata, position,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID, systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();

    const p = await program.account.pool.fetch(pool);
    assert.equal(p.totalStaked.toString(), "100000000");
    assert.equal(p.outcomeTotals[0].toString(), "100000000");
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `cd anchor && anchor test`
Expected: pool creation + stake pass; balances/totals correct.

- [ ] **Step 4: Commit**

```bash
cd /Users/HideOut/Documents/golazo
git add anchor/programs/golazo_predict/src/lib.rs anchor/tests/golazo_predict.ts
git commit -m "golazo_predict: init_pool + stake with lock enforcement"
```

---

### Task 7: `settle` via CPI into `txline_mock::validate_stat`

**Files:**
- Modify: `anchor/programs/golazo_predict/src/lib.rs`
- Modify: `anchor/tests/golazo_predict.ts`

**Interfaces:**
- Consumes: `txline_mock::cpi::validate_stat`, `txline_mock::MatchRoot`.
- Produces: `settle(ctx, claimed_value: u64, proof: Vec<[u8;32]>)` — CPIs `validate_stat(pool.match_id, market->stat_key, claimed_value, proof)`; on success sets `winning_outcome = claimed_value as u8` and `status = 1`. The market's `stat_key` is `pool.market_id` mapped to the TxLINE key; for the demo the **market_id IS the stat_key** ("winner" etc.), and `claimed_value` is the winning outcome index.

- [ ] **Step 1: Add the CPI dependency import + settle instruction**

At the top of `lib.rs` add:
```rust
use txline_mock::cpi::accounts::ValidateStat as TxValidateStat;
use txline_mock::program::TxlineMock;
```
Add inside `#[program]`:
```rust
    pub fn settle(ctx: Context<Settle>, claimed_value: u64, proof: Vec<[u8; 32]>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        require!(pool.status == 0, GolazoError::PoolClosed);
        require!((claimed_value as u8) < pool.num_outcomes, GolazoError::BadOutcome);

        txline_mock::cpi::validate_stat(
            CpiContext::new(
                ctx.accounts.txline_program.to_account_info(),
                TxValidateStat { match_root: ctx.accounts.match_root.to_account_info() },
            ),
            pool.match_id.clone(),
            pool.market_id.clone(),
            claimed_value,
            proof,
        )?;

        pool.winning_outcome = claimed_value as u8;
        pool.status = 1;
        Ok(())
    }
```
Add the accounts context:
```rust
#[derive(Accounts)]
pub struct Settle<'info> {
    #[account(mut, seeds = [b"pool", pool.match_id.as_bytes(), pool.market_id.as_bytes()], bump = pool.bump)]
    pub pool: Account<'info, Pool>,
    /// CHECK: validated inside the CPI by seeds in txline_mock
    pub match_root: UncheckedAccount<'info>,
    pub txline_program: Program<'info, TxlineMock>,
}
```

- [ ] **Step 2: Add the failing test (settle sets winner via CPI)**

Append to the `pool + stake` describe (reuse `pool`, `matchId`, `marketId`), adding the txline program + proof:
```ts
  it("settles the pool via validate_stat CPI", async () => {
    const txline = anchor.workspace.TxlineMock as anchor.Program;
    const { buildMatchProof, proofForStat, STAT_KEYS } = await import("../../lib/txline/proof");
    const stats = { [STAT_KEYS.winner]: 0n, [STAT_KEYS.totals]: 1n, [STAT_KEYS.btts]: 1n, [STAT_KEYS.chaos]: 0n };
    // Note: market_id "winner" must equal STAT_KEYS.winner
    const arr = (u: Uint8Array) => Array.from(u);
    const { root } = buildMatchProof(matchId, stats);
    const rootPda = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("root"), Buffer.from(matchId)], txline.programId)[0];
    await txline.methods.postRoot(matchId, arr(root)).accounts({
      oracle: provider.wallet.publicKey, matchRoot: rootPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();

    const { claimedValue, proof } = proofForStat(matchId, stats, STAT_KEYS.winner);
    await program.methods.settle(new anchor.BN(claimedValue.toString()), proof.map(arr)).accounts({
      pool, matchRoot: rootPda, txlineProgram: txline.programId,
    }).rpc();

    const p = await program.account.pool.fetch(pool);
    assert.equal(p.status, 1);
    assert.equal(p.winningOutcome, 0);
  });
```
> Ensure `marketId` used in Task 6 equals `STAT_KEYS.winner` ("winner") so the CPI proof matches.

- [ ] **Step 3: Run tests**

Run: `cd anchor && anchor test`
Expected: settle passes; pool status=1, winningOutcome=0. A wrong `claimed_value` would fail inside the CPI (covered by txline_mock tests).

- [ ] **Step 4: Commit**

```bash
cd /Users/HideOut/Documents/golazo
git add anchor/programs/golazo_predict/src/lib.rs anchor/tests/golazo_predict.ts
git commit -m "golazo_predict: settle via real CPI into txline_mock::validate_stat"
```

---

### Task 8: `claim` (parimutuel payout + guards + refund)

**Files:**
- Modify: `anchor/programs/golazo_predict/src/lib.rs`
- Modify: `anchor/tests/golazo_predict.ts`

**Interfaces:**
- Produces: `claim(ctx)` — requires `status==1`, `!position.claimed`. Payout: if `outcome_totals[winning] == 0` (refund path) pay back `position.amount`; else require `position.outcome == winning_outcome` and pay `position.amount * total_staked / outcome_totals[winning]` (u128 intermediate). Transfers vault→user_ata signed by the pool PDA; sets `claimed=true`.

- [ ] **Step 1: Add the claim instruction**

Inside `#[program]`:
```rust
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let pool = &ctx.accounts.pool;
        require!(pool.status == 1, GolazoError::NotSettled);
        let pos = &mut ctx.accounts.position;
        require!(!pos.claimed, GolazoError::AlreadyClaimed);

        let win_total = pool.outcome_totals[pool.winning_outcome as usize];
        let payout: u64 = if win_total == 0 {
            pos.amount // refund: nobody picked the winner
        } else {
            require!(pos.outcome == pool.winning_outcome, GolazoError::NotWinner);
            ((pos.amount as u128) * (pool.total_staked as u128) / (win_total as u128)) as u64
        };

        let match_id = pool.match_id.clone();
        let market_id = pool.market_id.clone();
        let bump = pool.bump;
        let seeds: &[&[u8]] = &[b"pool", match_id.as_bytes(), market_id.as_bytes(), &[bump]];
        let signer = &[seeds];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user_ata.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer,
            ),
            payout,
        )?;
        pos.claimed = true;
        Ok(())
    }
```
Add accounts:
```rust
#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(seeds = [b"pool", pool.match_id.as_bytes(), pool.market_id.as_bytes()], bump = pool.bump)]
    pub pool: Account<'info, Pool>,
    #[account(mut, seeds = [b"vault", pool.key().as_ref()], bump)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_ata: Account<'info, TokenAccount>,
    #[account(mut, seeds = [b"pos", pool.key().as_ref(), user.key().as_ref()], bump,
        constraint = position.user == user.key())]
    pub position: Account<'info, Position>,
    pub token_program: Program<'info, Token>,
}
```

- [ ] **Step 2: Add the failing test (winner claims the whole pool)**

Because the earlier describe only staked outcome 0 (the winner) once, the winner should reclaim ~`total_staked`. Append:
```ts
  it("lets the winner claim the pool", async () => {
    const ata = getAssociatedTokenAddressSync(mint, provider.wallet.publicKey);
    const position = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pos"), pool.toBuffer(), provider.wallet.publicKey.toBuffer()], program.programId)[0];
    const before = await provider.connection.getTokenAccountBalance(ata);
    await program.methods.claim().accounts({
      user: provider.wallet.publicKey, pool, vault, userAta: ata, position,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
    }).rpc();
    const after = await provider.connection.getTokenAccountBalance(ata);
    assert.isTrue(Number(after.value.amount) > Number(before.value.amount));
    const pos = await program.account.position.fetch(position);
    assert.equal(pos.claimed, true);
  });
```

- [ ] **Step 3: Run tests**

Run: `cd anchor && anchor test`
Expected: claim pays the winner; `claimed=true`. Re-running `claim` would error `AlreadyClaimed`.

- [ ] **Step 4: Commit**

```bash
cd /Users/HideOut/Documents/golazo
git add anchor/programs/golazo_predict/src/lib.rs anchor/tests/golazo_predict.ts
git commit -m "golazo_predict: parimutuel claim with refund + double-claim guard"
```

---

## Phase 4 — Deploy to devnet

### Task 9: Deploy programs + initialize on-chain state + write env

**Files:**
- Create: `anchor/scripts/setup-devnet.ts`
- Modify: `anchor/Anchor.toml` (real program IDs)
- Modify: `.env.local` (NEXT_PUBLIC_* program IDs + mint)
- Create: `.env.example` entries

**Interfaces:**
- Produces env: `NEXT_PUBLIC_SOLANA_CLUSTER=devnet`, `NEXT_PUBLIC_GOLAZO_PREDICT_PROGRAM`, `NEXT_PUBLIC_TXLINE_MOCK_PROGRAM`, `NEXT_PUBLIC_GOLAZO_MINT`.

- [ ] **Step 1: Sync program keys and build**

Run:
```bash
cd anchor
anchor keys sync
anchor build
```
Expected: `anchor keys sync` writes real declared IDs into `lib.rs` + `Anchor.toml`. Re-build clean.

- [ ] **Step 2: Deploy to devnet**

Run: `anchor deploy --provider.cluster devnet`
Expected: both programs deploy; prints program IDs. If it fails for funds, `solana airdrop 2` and retry.

- [ ] **Step 3: Write the setup script (init mint + demo root)**

Create `anchor/scripts/setup-devnet.ts`:
```ts
import * as anchor from "@coral-xyz/anchor";
import { buildMatchProof, STAT_KEYS } from "../../lib/txline/proof";

(async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const predict = anchor.workspace.GolazoPredict as anchor.Program;
  const txline = anchor.workspace.TxlineMock as anchor.Program;

  const [mint] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("golazo_mint")], predict.programId);
  const [mintAuth] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("mint_auth")], predict.programId);
  try {
    await predict.methods.initMint().accounts({
      payer: provider.wallet.publicKey, mintAuthority: mintAuth, mint,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId, rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    }).rpc();
    console.log("mint initialized");
  } catch (e) { console.log("mint exists?", (e as Error).message); }

  const matchId = "ABLRVR";
  const stats = { [STAT_KEYS.winner]: 0n, [STAT_KEYS.totals]: 1n, [STAT_KEYS.btts]: 1n, [STAT_KEYS.chaos]: 0n };
  const { root } = buildMatchProof(matchId, stats);
  const [rootPda] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("root"), Buffer.from(matchId)], txline.programId);
  await txline.methods.postRoot(matchId, Array.from(root)).accounts({
    oracle: provider.wallet.publicKey, matchRoot: rootPda, systemProgram: anchor.web3.SystemProgram.programId,
  }).rpc();
  console.log("demo root posted for", matchId);

  console.log("NEXT_PUBLIC_GOLAZO_PREDICT_PROGRAM=" + predict.programId.toBase58());
  console.log("NEXT_PUBLIC_TXLINE_MOCK_PROGRAM=" + txline.programId.toBase58());
  console.log("NEXT_PUBLIC_GOLAZO_MINT=" + mint.toBase58());
})();
```

- [ ] **Step 4: Run the setup script**

Run: `cd anchor && anchor run setup-devnet 2>/dev/null || npx ts-node scripts/setup-devnet.ts`
(If `anchor run` is not configured, add `setup-devnet = "npx ts-node scripts/setup-devnet.ts"` under `[scripts]` in `Anchor.toml`.)
Expected: prints the three `NEXT_PUBLIC_*` lines.

- [ ] **Step 5: Write env**

Append the printed lines to `/Users/HideOut/Documents/golazo/.env.local`, plus `NEXT_PUBLIC_SOLANA_CLUSTER=devnet`. Add the same keys (with empty values) to `.env.example`.

- [ ] **Step 6: Commit**

```bash
cd /Users/HideOut/Documents/golazo
git add anchor/Anchor.toml anchor/programs/*/src/lib.rs anchor/scripts/setup-devnet.ts .env.example
git commit -m "Deploy settlement programs to devnet + init mint/demo root"
```
(Do NOT commit `.env.local`.)

---

## Phase 5 — Frontend integration

### Task 10: Copy IDLs + Anchor client lib

**Files:**
- Create: `lib/chain/ids.ts`
- Create: `lib/chain/idl/golazo_predict.json` (copied from `anchor/target/idl/`)
- Create: `lib/chain/idl/txline_mock.json`
- Create: `lib/chain/client.ts`
- Test: `lib/chain/ids.test.ts`

**Interfaces:**
- Produces:
  - `CLUSTER`, `PROGRAM_IDS = { predict: PublicKey, txline: PublicKey }`, `GOLAZO_MINT: PublicKey` (from env).
  - `getPredictProgram(connection, wallet): Program`, `getTxlineProgram(...)`.
  - PDA helpers: `poolPda(matchId, marketId)`, `vaultPda(pool)`, `positionPda(pool, user)`, `mintAuthPda()`, `rootPda(matchId)`.

- [ ] **Step 1: Install web3 + anchor client deps**

Run: `npm i @coral-xyz/anchor @solana/web3.js @solana/spl-token`
Expected: installed.

- [ ] **Step 2: Copy IDLs**

Run:
```bash
mkdir -p lib/chain/idl
cp anchor/target/idl/golazo_predict.json lib/chain/idl/
cp anchor/target/idl/txline_mock.json lib/chain/idl/
```

- [ ] **Step 3: Write the failing test (env parsing + PDA determinism)**

Create `lib/chain/ids.test.ts`:
```ts
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.NEXT_PUBLIC_SOLANA_CLUSTER = "devnet";
  process.env.NEXT_PUBLIC_GOLAZO_PREDICT_PROGRAM = "11111111111111111111111111111112";
  process.env.NEXT_PUBLIC_TXLINE_MOCK_PROGRAM = "11111111111111111111111111111113";
  process.env.NEXT_PUBLIC_GOLAZO_MINT = "11111111111111111111111111111114";
});

it("derives a stable pool PDA", async () => {
  const { poolPda } = await import("@/lib/chain/ids");
  const a = poolPda("ABLRVR", "winner").toBase58();
  const b = poolPda("ABLRVR", "winner").toBase58();
  expect(a).toEqual(b);
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run lib/chain/ids.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement ids + client**

Create `lib/chain/ids.ts`:
```ts
import { PublicKey } from "@solana/web3.js";

function pk(name: string): PublicKey {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return new PublicKey(v);
}

export const CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet") as "devnet" | "mainnet-beta";
export const PROGRAM_IDS = {
  get predict() { return pk("NEXT_PUBLIC_GOLAZO_PREDICT_PROGRAM"); },
  get txline() { return pk("NEXT_PUBLIC_TXLINE_MOCK_PROGRAM"); },
};
export const GOLAZO_MINT = () => pk("NEXT_PUBLIC_GOLAZO_MINT");

const enc = (s: string) => Buffer.from(s);

export function poolPda(matchId: string, marketId: string): PublicKey {
  return PublicKey.findProgramAddressSync([enc("pool"), enc(matchId), enc(marketId)], PROGRAM_IDS.predict)[0];
}
export function vaultPda(pool: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([enc("vault"), pool.toBuffer()], PROGRAM_IDS.predict)[0];
}
export function positionPda(pool: PublicKey, user: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([enc("pos"), pool.toBuffer(), user.toBuffer()], PROGRAM_IDS.predict)[0];
}
export function mintAuthPda(): PublicKey {
  return PublicKey.findProgramAddressSync([enc("mint_auth")], PROGRAM_IDS.predict)[0];
}
export function rootPda(matchId: string): PublicKey {
  return PublicKey.findProgramAddressSync([enc("root"), enc(matchId)], PROGRAM_IDS.txline)[0];
}
```
Create `lib/chain/client.ts`:
```ts
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { PROGRAM_IDS } from "@/lib/chain/ids";
import predictIdl from "@/lib/chain/idl/golazo_predict.json";
import txlineIdl from "@/lib/chain/idl/txline_mock.json";

function provider(connection: Connection, wallet: AnchorWallet): AnchorProvider {
  return new AnchorProvider(connection, wallet, { commitment: "confirmed" });
}
export function getPredictProgram(connection: Connection, wallet: AnchorWallet): Program {
  return new Program(predictIdl as Idl, PROGRAM_IDS.predict, provider(connection, wallet));
}
export function getTxlineProgram(connection: Connection, wallet: AnchorWallet): Program {
  return new Program(txlineIdl as Idl, PROGRAM_IDS.txline, provider(connection, wallet));
}
```

- [ ] **Step 6: Run test + full suite**

Run: `npx vitest run lib/chain/ids.test.ts && npx vitest run`
Expected: new test passes; existing 117 stay green (total grows).

- [ ] **Step 7: Commit**

```bash
git add lib/chain package.json package-lock.json
git commit -m "Add Anchor client + PDA helpers + IDLs for the frontend"
```

---

### Task 11: Wallet-adapter provider (SSR-safe)

**Files:**
- Create: `components/chain/WalletConnectionProvider.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: a client provider wrapping the app with `ConnectionProvider` (devnet RPC) + `WalletProvider` ([Phantom, Solflare]) + `WalletModalProvider`.

- [ ] **Step 1: Install wallet-adapter deps**

Run: `npm i @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @solana/wallet-adapter-base`
Expected: installed.

- [ ] **Step 2: Create the provider (client-only)**

Create `components/chain/WalletConnectionProvider.tsx`:
```tsx
"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

export default function WalletConnectionProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_SOLANA_RPC ?? clusterApiUrl("devnet"),
    [],
  );
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

- [ ] **Step 3: Mount it in the layout via dynamic import (ssr:false)**

In `app/layout.tsx`, add near the top:
```tsx
import dynamic from "next/dynamic";
const WalletConnectionProvider = dynamic(
  () => import("@/components/chain/WalletConnectionProvider"),
  { ssr: false },
);
```
Wrap the existing body content (SideNav/main/BottomNav/IntroModal) with `<WalletConnectionProvider>…</WalletConnectionProvider>`.

- [ ] **Step 4: Verify the app still builds + tests green**

Run: `npx tsc --noEmit && npx next lint && npx vitest run`
Expected: clean; 117 tests still pass.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx components/chain/WalletConnectionProvider.tsx package.json package-lock.json
git commit -m "Add SSR-safe Solana wallet-adapter provider"
```

---

### Task 12: SSE live-match stream + client hook

**Files:**
- Create: `app/api/stream/route.ts`
- Create: `lib/live/useMatchStream.ts`
- Test: `lib/live/streamEvents.test.ts`
- Create: `lib/live/streamEvents.ts`

**Interfaces:**
- Produces:
  - `parseStreamEvent(raw: string): MatchStreamEvent | null` where `MatchStreamEvent = { matchId: string; minute: number; homeScore: number; awayScore: number; state: "LIVE"|"FT" }`.
  - SSE route streaming a scripted sequence for `?matchId=ABLRVR` ending in `FT`.
  - `useMatchStream(matchId): MatchStreamEvent | null` (client hook via `EventSource`).

- [ ] **Step 1: Write the failing parser test**

Create `lib/live/streamEvents.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseStreamEvent } from "@/lib/live/streamEvents";

it("parses a data line into a typed event", () => {
  const e = parseStreamEvent(JSON.stringify({ matchId: "ABLRVR", minute: 90, homeScore: 3, awayScore: 1, state: "FT" }));
  expect(e).toEqual({ matchId: "ABLRVR", minute: 90, homeScore: 3, awayScore: 1, state: "FT" });
});
it("returns null on malformed input", () => {
  expect(parseStreamEvent("not json")).toBeNull();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/live/streamEvents.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement parser**

Create `lib/live/streamEvents.ts`:
```ts
export interface MatchStreamEvent {
  matchId: string;
  minute: number;
  homeScore: number;
  awayScore: number;
  state: "LIVE" | "FT";
}

export function parseStreamEvent(raw: string): MatchStreamEvent | null {
  try {
    const o = JSON.parse(raw);
    if (typeof o.matchId !== "string" || (o.state !== "LIVE" && o.state !== "FT")) return null;
    return {
      matchId: o.matchId, minute: Number(o.minute) || 0,
      homeScore: Number(o.homeScore) || 0, awayScore: Number(o.awayScore) || 0, state: o.state,
    };
  } catch { return null; }
}
```

- [ ] **Step 4: Implement the SSE route**

Create `app/api/stream/route.ts`:
```ts
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get("matchId") ?? "ABLRVR";
  const frames = [
    { minute: 67, homeScore: 1, awayScore: 1, state: "LIVE" as const },
    { minute: 79, homeScore: 2, awayScore: 1, state: "LIVE" as const },
    { minute: 84, homeScore: 3, awayScore: 1, state: "LIVE" as const },
    { minute: 90, homeScore: 3, awayScore: 1, state: "FT" as const },
  ];
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (const f of frames) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ matchId, ...f })}\n\n`));
        await new Promise((r) => setTimeout(r, 1500));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
```

- [ ] **Step 5: Implement the client hook**

Create `lib/live/useMatchStream.ts`:
```ts
"use client";
import { useEffect, useState } from "react";
import { parseStreamEvent, type MatchStreamEvent } from "@/lib/live/streamEvents";

export function useMatchStream(matchId: string): MatchStreamEvent | null {
  const [event, setEvent] = useState<MatchStreamEvent | null>(null);
  useEffect(() => {
    const es = new EventSource(`/api/stream?matchId=${encodeURIComponent(matchId)}`);
    es.onmessage = (m) => { const e = parseStreamEvent(m.data); if (e) setEvent(e); };
    es.onerror = () => es.close();
    return () => es.close();
  }, [matchId]);
  return event;
}
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run lib/live/streamEvents.test.ts && npx vitest run`
Expected: parser tests pass; suite green.

- [ ] **Step 7: Commit**

```bash
git add app/api/stream lib/live
git commit -m "Add SSE live-match stream + parser + client hook"
```

---

### Task 13: Real wallet mode — connect, GOLAZO balance, faucet

**Files:**
- Modify: `components/predict/WalletPanel.tsx`
- Create: `lib/chain/useGolazo.ts`
- Modify: `lib/predict/types.ts` (no change to WalletState needed; keep)

**Interfaces:**
- Consumes: `getPredictProgram`, `GOLAZO_MINT`, `mintAuthPda` (Task 10); wallet-adapter `useWallet`, `useConnection`.
- Produces: `useGolazo()` → `{ connected, address, balance, refresh, faucet(): Promise<void> }`.

- [ ] **Step 1: Implement the GOLAZO hook**

Create `lib/chain/useGolazo.ts`:
```ts
"use client";
import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SystemProgram } from "@solana/web3.js";
import { getPredictProgram } from "@/lib/chain/client";
import { GOLAZO_MINT, mintAuthPda } from "@/lib/chain/ids";

export function useGolazo() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const [balance, setBalance] = useState<number>(0);

  const refresh = useCallback(async () => {
    if (!publicKey) { setBalance(0); return; }
    try {
      const ata = getAssociatedTokenAddressSync(GOLAZO_MINT(), publicKey);
      const b = await connection.getTokenAccountBalance(ata);
      setBalance(Number(b.value.uiAmount ?? 0));
    } catch { setBalance(0); }
  }, [connection, publicKey]);

  useEffect(() => { void refresh(); }, [refresh]);

  const faucet = useCallback(async () => {
    if (!anchorWallet || !publicKey) return;
    const program = getPredictProgram(connection, anchorWallet);
    const mint = GOLAZO_MINT();
    const ata = getAssociatedTokenAddressSync(mint, publicKey);
    await program.methods.faucet(new (await import("@coral-xyz/anchor")).BN(500_000_000)).accounts({
      user: publicKey, mint, mintAuthority: mintAuthPda(), userAta: ata,
      tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    }).rpc();
    await refresh();
  }, [anchorWallet, publicKey, connection, refresh]);

  return { connected: !!publicKey, address: publicKey?.toBase58() ?? null, balance, refresh, faucet };
}
```

- [ ] **Step 2: Wire the real wallet button + balance + faucet into WalletPanel**

In `components/predict/WalletPanel.tsx`, replace the mock `connected`/`setConnected` local state with the wallet-adapter modal button and `useGolazo()`. Key edits: import `WalletMultiButton` from `@solana/wallet-adapter-react-ui` (render it where the "Connect wallet (preview)" button was), use `useGolazo()` for `connected`/`address`/`balance`, and add a "Claim 500 GOLAZO (devnet faucet)" button that calls `faucet()`. Remove the "Preview" badge; keep the disclaimer but change to "Devnet — test tokens, no real money." Show `balance` in the connected card.

> Keep the component a client component. Reward claim buttons stay as-is for now (Task 14 wires pool claim separately).

- [ ] **Step 3: Update WalletPanel test for the real flow**

In `components/predict/WalletPanel.test.tsx`, the connect button is now `WalletMultiButton`, which needs providers. Simplify: wrap renders in a minimal mock by mocking `@solana/wallet-adapter-react` (`useWallet`, `useConnection`, `useAnchorWallet`) and `@/lib/chain/useGolazo` to return a disconnected then connected fixture. Assert: disconnected → shows connect affordance + no balance; connected → shows truncated address + balance + faucet button. (Replace the prior preview-specific assertions.)

```ts
import { vi } from "vitest";
vi.mock("@/lib/chain/useGolazo", () => ({
  useGolazo: () => ({ connected: true, address: "7xKXabc...9fQ2", balance: 500, refresh: vi.fn(), faucet: vi.fn() }),
}));
vi.mock("@solana/wallet-adapter-react-ui", () => ({ WalletMultiButton: () => null }));
```

- [ ] **Step 4: Run checks**

Run: `npx tsc --noEmit && npx vitest run components/predict/WalletPanel.test.tsx && npx vitest run`
Expected: WalletPanel tests pass; full suite green.

- [ ] **Step 5: Commit**

```bash
git add components/predict/WalletPanel.tsx components/predict/WalletPanel.test.tsx lib/chain/useGolazo.ts
git commit -m "Wallet mode: real connect + GOLAZO balance + devnet faucet"
```

---

### Task 14: On-chain pool UX — stake / settle / claim on a match

**Files:**
- Create: `lib/chain/usePool.ts`
- Create: `components/predict/chain/OnChainPool.tsx`
- Modify: `components/predict/MatchPickScreen.tsx` and `components/predict/MatchPickDesktop.tsx` (mount `OnChainPool` when wallet connected)

**Interfaces:**
- Consumes: `getPredictProgram`, `getTxlineProgram`, PDA helpers, `proofForStat`, `useMatchStream`.
- Produces: `usePool(matchId, marketId)` → `{ pool, position, stake(outcome, amount), settle(), claim(), refresh }`; `OnChainPool` component rendering pool totals, stake buttons, a settle button (enabled on FT), and a claim button (enabled when settled & winner).

- [ ] **Step 1: Implement the pool hook**

Create `lib/chain/usePool.ts` (uses Anchor program calls with the PDAs; `settle` builds the proof from the streamed final result via `proofForStat`). Core shape:
```ts
"use client";
import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SystemProgram } from "@solana/web3.js";
import { getPredictProgram } from "@/lib/chain/client";
import { GOLAZO_MINT, poolPda, vaultPda, positionPda, rootPda, PROGRAM_IDS } from "@/lib/chain/ids";
import { proofForStat, STAT_KEYS } from "@/lib/txline/proof";

export function usePool(matchId: string, marketId: string) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const wallet = useAnchorWallet();
  const [pool, setPool] = useState<any>(null);
  const [position, setPosition] = useState<any>(null);

  const refresh = useCallback(async () => {
    if (!wallet) return;
    const program = getPredictProgram(connection, wallet);
    const p = poolPda(matchId, marketId);
    setPool(await program.account.pool.fetchNullable(p));
    if (publicKey) setPosition(await program.account.position.fetchNullable(positionPda(p, publicKey)));
  }, [connection, wallet, publicKey, matchId, marketId]);
  useEffect(() => { void refresh(); }, [refresh]);

  const stake = useCallback(async (outcome: number, amount: number) => {
    if (!wallet || !publicKey) return;
    const program = getPredictProgram(connection, wallet);
    const p = poolPda(matchId, marketId);
    await program.methods.stake(outcome, new BN(amount)).accounts({
      user: publicKey, pool: p, vault: vaultPda(p),
      userAta: getAssociatedTokenAddressSync(GOLAZO_MINT(), publicKey), position: positionPda(p, publicKey),
      tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
    }).rpc();
    await refresh();
  }, [connection, wallet, publicKey, matchId, marketId, refresh]);

  const settle = useCallback(async (stats: Record<string, bigint>) => {
    if (!wallet) return;
    const program = getPredictProgram(connection, wallet);
    const p = poolPda(matchId, marketId);
    const { claimedValue, proof } = proofForStat(matchId, stats, marketId);
    await program.methods.settle(new BN(claimedValue.toString()), proof.map((u) => Array.from(u))).accounts({
      pool: p, matchRoot: rootPda(matchId), txlineProgram: PROGRAM_IDS.txline,
    }).rpc();
    await refresh();
  }, [connection, wallet, matchId, marketId, refresh]);

  const claim = useCallback(async () => {
    if (!wallet || !publicKey) return;
    const program = getPredictProgram(connection, wallet);
    const p = poolPda(matchId, marketId);
    await program.methods.claim().accounts({
      user: publicKey, pool: p, vault: vaultPda(p),
      userAta: getAssociatedTokenAddressSync(GOLAZO_MINT(), publicKey), position: positionPda(p, publicKey),
      tokenProgram: TOKEN_PROGRAM_ID,
    }).rpc();
    await refresh();
  }, [connection, wallet, publicKey, matchId, marketId, refresh]);

  return { pool, position, stake, settle, claim, refresh, STAT_KEYS };
}
```

- [ ] **Step 2: Build the OnChainPool component**

Create `components/predict/chain/OnChainPool.tsx`: a client component taking `{ matchId, marketId, outcomes: string[] }`. Uses `usePool` + `useMatchStream(matchId)`. Renders: per-outcome totals + implied % (outcome_total/total_staked), a stake input + "Stake GOLAZO" per outcome (calls `stake`), a "Settle pool" button shown when the stream `state === "FT"` (calls `settle` with the final stats derived from the streamed score — map FT score to STAT_KEYS values), and a "Claim winnings" button when `pool.status===1` and the user's `position.outcome === pool.winningOutcome`. Gate the whole component behind `useWallet().connected`; if not connected, render the existing `WalletMultiButton`. Match the app's ink/neon styling.

> Deriving stats from the streamed score: `winner = home>away?0 : home<away?2 : 1`; `total_goals_over25 = (home+away)>2?1:0`; `btts = home>0 && away>0?1:0`; `chaos` = (not derivable from score alone) default 0 for the demo. Only the active `marketId` proof is used for settle.

- [ ] **Step 3: Mount it on the match screens**

In `components/predict/MatchPickScreen.tsx` (mobile) and `components/predict/MatchPickDesktop.tsx`, render `<OnChainPool matchId={match.id} marketId="winner" outcomes={[home, "Draw", away]} />` below the existing pick UI, wrapped so it only mounts client-side. (Dynamic import with `ssr:false` to avoid wallet SSR issues.)

- [ ] **Step 4: Type + lint + tests**

Run: `npx tsc --noEmit && npx next lint && npx vitest run`
Expected: clean; existing tests green. (No new vitest unit tests for the wallet UI; covered by manual E2E + Playwright in Task 15.)

- [ ] **Step 5: Commit**

```bash
git add lib/chain/usePool.ts components/predict/chain/OnChainPool.tsx components/predict/MatchPickScreen.tsx components/predict/MatchPickDesktop.tsx
git commit -m "On-chain parimutuel pool UX: stake, SSE-triggered settle, claim"
```

---

### Task 15: Merkle verify panel + manual devnet E2E + Playwright

**Files:**
- Create: `components/predict/chain/VerifyPanel.tsx`
- Modify: `components/predict/ProofExplorer.tsx` (mount VerifyPanel)

**Interfaces:**
- Consumes: `proofForStat`, `verifyProof`, `hashLeaf`, `toHex`.
- Produces: `VerifyPanel` showing leaf/root/proof path hex + a live client-side ✓/✗.

- [ ] **Step 1: Build the verify panel**

Create `components/predict/chain/VerifyPanel.tsx`: client component taking `{ matchId, marketId, stats }`. Computes `proofForStat`, `hashLeaf`, runs `verifyProof`, and renders the leaf, root, each proof element (`toHex`), and a green "✓ Merkle proof verified against TxLINE root" (or red ✗). Style to match the proof explorer's ink panels.

- [ ] **Step 2: Mount in ProofExplorer**

In `components/predict/ProofExplorer.tsx`, add the `VerifyPanel` as an extra section (use a demo stats map for the receipt's match/market). Keep it additive — don't disturb existing panels/tests.

- [ ] **Step 3: Type/lint/tests**

Run: `npx tsc --noEmit && npx next lint && npx vitest run`
Expected: clean; 117+ tests green.

- [ ] **Step 4: Manual devnet end-to-end (documented)**

With the dev server running and a Phantom devnet wallet:
1. Open `/wallet`, connect, click faucet → balance increases.
2. Open the live match (`/match/ABLRVR`), create/stake into an outcome (first staker also runs `init_pool` — add an "Open this pool" affordance in `OnChainPool` calling `init_pool` if `pool === null`).
3. Watch the SSE stream reach FT → click "Settle pool" → tx confirms (CPI into validate_stat).
4. Click "Claim winnings" → GOLAZO balance increases.
Record the tx signatures in the PR/notes. Confirm a second wallet staking the losing outcome cannot claim.

- [ ] **Step 5: Playwright wallet UI states**

Add a Playwright check (screenshots) at 390px + 1280px for `/wallet` disconnected and the match pool UI rendering. (Wallet signing isn't automated; visual states only.)

- [ ] **Step 6: Commit**

```bash
git add components/predict/chain/VerifyPanel.tsx components/predict/ProofExplorer.tsx
git commit -m "Merkle verify panel in proof explorer + on-chain pool open affordance"
```

---

## Self-review notes (coverage)

- Spec §3.1 on-chain programs → Tasks 4–8. §3.2 SSE + Merkle → Tasks 2–3, 12, 15. §3.3 frontend → Tasks 10–15.
- §4 golazo_predict (init/stake/settle/claim, refund, double-claim) → Tasks 5–8. §5 txline_mock (post_root/validate_stat) → Task 4. §6 SSE+verify flow → Tasks 12, 14, 15. §7 repo structure → all. §8 toolchain/deploy → Tasks 1, 9. §9 testing → embedded per task. §10 guardrails → Global Constraints + Task 14 notes.
- Note: Task 14 adds an `init_pool` "open pool" affordance (first staker opens the pool) — surfaced in the manual E2E step so pools exist before staking.
- Naming consistency check: `poolPda/vaultPda/positionPda/rootPda/mintAuthPda`, `STAT_KEYS`, `proofForStat`, `hashLeaf/verifyProof/buildTree/proofFor` are used identically across tasks. Program method names (`initMint/faucet/initPool/stake/settle/claim/postRoot/validateStat`) match between Rust and TS calls.
