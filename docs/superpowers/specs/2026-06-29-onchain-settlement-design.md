# Golazo On-Chain Parimutuel Settlement + Real Wallet Mode — Design

**Date:** 2026-06-29
**Cairn task:** #62 (P2-14)
**Status:** built (devnet deploy pending funds)

---

## REVISION (2026-06-29) — Golazo Markets scope correction (supersedes below where conflicting)

User scope correction split the product into **two modes** and narrowed the
on-chain piece. This section is authoritative where it differs from the original
design below.

- **Two modes.** (1) *Golazo Picks* — existing free-to-play social game, unchanged.
  (2) *Golazo Markets* — devnet-only **YES/NO** binary markets in a **mock SPL
  token** ("GOLAZO demo credits"), PDA escrow, claim/refund. A "Free Picks |
  Market Mode" toggle on the match screen switches between them.
- **Binary market, not N-outcome.** `golazo_predict` stores `yes_total`/`no_total`,
  status (`Open/Locked/Live/Settling/Settled/Void`), `winning_side`, `keeper`.
  Still parimutuel (zero rake, pro-rata, refund path when winning side empty).
- **Keeper-gated `settle`** (was permissionless) — `settle`/`void`/`set_status`
  require `keeper` signer; `settle` still CPIs into `txline_mock::validate_stat`.
- **Asset adapter abstraction** (`lib/markets/assets`): `SplAssetAdapter` (live)
  + `NativeSolAdapter` stub (throws, flag-gated). Swap-ready, native SOL NOT built.
- **Feature flags** (`lib/markets/flags.ts`): `NEXT_PUBLIC_ENABLE_MARKET_MODE`,
  `NEXT_PUBLIC_SOLANA_CLUSTER=devnet`, `NEXT_PUBLIC_ENABLE_DEVNET_SPL_ESCROW`,
  `NEXT_PUBLIC_ENABLE_NATIVE_SOL_SETTLEMENT=false`, `NEXT_PUBLIC_ENABLE_MAINNET_MARKETS=false`.
- **Postgres (Prisma) index layer.** Chain = source of truth for escrow/positions/
  settlement; Postgres mirrors it (every tx written with signature/wallet/market/
  metadata) and powers screens, receipts, leagues, history. Server-only client,
  Node runtime. Models: User, Wallet, Match, Market, MarketPosition, TxlineEvent,
  Settlement, ProofReceipt, Transaction, PrivateLeague + LeagueMember. Neon for
  deployed envs; local Postgres for dev.
- **Stat keys are binary** (`home_win`/`over25`/`btts` = 0/1) so `settle`'s
  `claimed_value` maps directly to `winning_side`.
- **Toolchain:** see [[anchor-sbf-edition2024-fix]] memory. 8 anchor program tests
  + 142 vitest tests green.

---

## 1. Goal

Upgrade wallet mode from the P1-22 preview into a **real Solana devnet Web3
prediction-settlement system** that directly targets the hackathon TxLINE track's
three scoring points:

1. **Data-driven Web3** — an SSE live-match stream drives prediction resolution.
2. **Verification layer (judge-valued)** — real Merkle-proof verification of match
   results, both client-side and on-chain.
3. **Custom on-chain settlement engine** — a parimutuel program that performs a
   **Cross-Program Invocation into `validate_stat`** to release escrowed funds
   trustlessly.

Non-goals: mainnet, real money, fiat, the real TxLINE integration (mocked but
swap-ready), changes to unrelated screens.

### Track guardrails baked in
- **No P2P transfer of the TxLINE credit token.** Settlement uses a *different*
  coin: a custom "GOLAZO points" devnet SPL token.
- The `validate_stat` CPI + Merkle verification are the explicitly judge-valued
  pieces and are first-class here.

## 2. Key decisions (from brainstorm, 2026-06-29)

| Decision | Choice |
| --- | --- |
| TxLINE access | None yet → build a TxLINE-shaped **mock**, swap-ready |
| On-chain scope | **Full Anchor program** deployed to devnet |
| Settlement model | **Parimutuel pool** (stake into outcome buckets, winners split pro-rata) |
| Stake asset | **Custom "GOLAZO points" devnet SPL** + faucet |
| Oracle/`validate_stat` | **Approach A** — separate `txline_mock` program; `golazo_predict` does a real CPI into it |

## 3. Architecture (three layers)

### 3.1 On-chain (new `/anchor` Anchor workspace, Solana devnet)
- **`txline_mock`** — TxLINE stand-in. Stores a signed Merkle root per match;
  `validate_stat(...)` verifies a proof against that root. Shaped to match the
  expected real TxLINE interface so the consumer CPI is swap-ready.
- **`golazo_predict`** — the parimutuel settlement engine. CPIs into
  `txline_mock::validate_stat` during `settle`.
- **GOLAZO SPL mint** + a faucet instruction for test tokens.

### 3.2 Data / verification (Next.js)
- `app/api/stream/route.ts` — SSE endpoint emitting mock live events (minute,
  goals, FT) for a match.
- `lib/txline/` — Merkle library: build leaves/root/proofs and verify them, with
  **identical leaf encoding (sha256 over canonical bytes) on the TS and Rust
  sides** so client and chain agree byte-for-byte.

### 3.3 Frontend (Next.js)
- `@solana/wallet-adapter` provider (Phantom, Solflare), devnet, **client-only /
  SSR-safe** (dynamic import, `ssr: false`).
- `lib/chain/` — typed Anchor client (program IDLs + call wrappers + pool reads).
- Upgraded wallet mode: real connect, GOLAZO balance, faucet, positions/rewards.
- Pool UX on a match: pick outcome, stake GOLAZO, see pool totals/implied odds;
  on FT (from SSE) trigger `settle`; `claim` winnings.
- Merkle "verify ✓" panel in the proof explorer showing leaf/root/path/signature
  with live client-side verification.

## 4. On-chain: `golazo_predict` (parimutuel)

### Accounts
- **`Pool`** PDA, seeds `["pool", match_id, market_id]`: `outcomes` (N labels),
  per-outcome totals, `total_staked`, `status` (Open/Locked/Settled),
  `winning_outcome`, `lock_ts`, `mint`, `vault` (token account owned by a pool
  authority PDA).
- **`Position`** PDA, seeds `["pos", pool, user]`: `outcome`, `amount`, `claimed`.

### Instructions
- `init_pool(match_id, market_id, outcomes, lock_ts)` — create pool + vault.
- `stake(outcome, amount)` — transfer GOLAZO user ATA → vault; create/extend
  `Position`; update totals. **Rejected once `now >= lock_ts`.**
- `settle()` — **CPI into `txline_mock::validate_stat(match_id, stat_key,
  claimed_value, proof, leaf_index)`**; on success set `winning_outcome` and
  status `Settled`. Permissionless (anyone may call once the result exists).
- `claim()` — pay winner pro-rata:
  `payout = position.amount * total_staked / winning_outcome_total`; transfer
  vault → user ATA (pool-authority PDA signs); set `claimed`. Guards
  double-claim. **Refund path:** if `winning_outcome_total == 0`, allow each
  staker to reclaim their own stake.
- Demo rake = 0 (losers' stake redistributes to winners).

### Settlement math (deterministic, integer)
- Winner share uses integer math; remainder (dust) stays in the vault (acceptable
  for the demo). Payout never exceeds `total_staked`.

## 5. On-chain: `txline_mock` (`validate_stat` stand-in)

### Accounts
- **`MatchRoot`** PDA, seeds `["root", match_id]`: `root: [u8;32]`,
  `signature: [u8;64]`, `oracle: Pubkey`.

### Instructions
- `post_root(match_id, root, signature)` — oracle authority stores the signed
  Merkle root for a match.
- `validate_stat(match_id, stat_key, claimed_value, proof: Vec<[u8;32]>,
  leaf_index)` — recompute `leaf = sha256(canonical(match_id, stat_key,
  claimed_value))`, walk the Merkle `proof` to a computed root, require it equals
  the stored `MatchRoot.root`, and verify the root's ed25519 `signature` against a
  baked-in demo oracle pubkey. Returns ok / errors. **This is the exact shape we
  expect from real TxLINE**, so swap = change program ID + delete mock.

## 6. SSE + Merkle verification flow

1. `app/api/stream/route.ts` streams a match (minute ticks, goals, FT) over SSE.
2. Frontend `EventSource` subscribes; live cards update from the stream.
3. On **FT**, the UI surfaces "Result in — settle pool" and exposes the proof.
4. The Merkle panel shows leaf/root/path/signature and verifies client-side (✓).
5. `settle()` feeds the *same* proof to `validate_stat` on-chain.
6. Swap to real TxLINE later = change the SSE URL + the `txline` program ID; the
   leaf encoding and proof shape are already aligned.

## 7. Repo structure

```
/anchor
  Anchor.toml
  programs/golazo_predict/   # parimutuel settlement engine
  programs/txline_mock/      # validate_stat stand-in
  tests/                     # anchor mocha/ts tests (local validator)
/app/api/stream/route.ts     # SSE
/lib/txline/                 # merkle build + verify (TS), parity with Rust
/lib/chain/                  # anchor client, IDLs, program IDs from env
/components/predict/wallet/  # real wallet UI, pool stake/settle/claim, verify panel
```
- The existing mock `dataSource` stays for non-chain screens. Chain features are
  **additive and gated by wallet connection** — nothing else changes behavior.
- Program IDs + GOLAZO mint exposed via `NEXT_PUBLIC_*` env.

## 8. Toolchain & deploy

- Rust/Cargo present. **Solana CLI is installed** (PATH only:
  `~/.local/share/solana/install/active_release/bin`); **`avm` 1.0.2 present**.
- Steps: export PATH; `avm install <ver> && avm use <ver>`; create + airdrop a
  devnet keypair; `anchor build`; `anchor deploy --provider.cluster devnet`; mint
  GOLAZO; `post_root` a demo match; write program IDs + mint to `.env.local`.
- I run these; any step needing the user's machine/approval is surfaced.

## 9. Testing

- **Anchor/Rust (local validator):** init/stake/settle-via-CPI/claim happy path;
  parimutuel payout math; lock enforcement; double-claim guard; refund path
  (empty winning bucket); `validate_stat` proof success + tampered-proof failure.
- **TS (vitest):** TS↔Rust Merkle leaf/root/proof parity (fixed vectors); payout
  math; SSE event parsing. **Existing 117 tests stay green.**
- **Manual devnet E2E:** two wallets stake opposite outcomes → FT → settle →
  claim; Playwright for wallet UI states (disconnected/connected/staked/settled).

## 10. Scope guardrails (YAGNI) & risks

**In:** one token (GOLAZO SPL), one model (parimutuel), zero rake, 1–2 markets
(Match Winner H/D/A; optionally Over/Under 2.5) on the existing mock matches.

**Out:** mainnet, real money, fixed-odds/AMM, multiple tokens, rake/treasury,
fiat on/off-ramp, the real TxLINE integration (mocked, swap-ready).

**Risks & mitigations:**
- Devnet/toolchain friction → install + airdrop early, before program work.
- Cross-program CPI account plumbing (`golazo_predict` → `txline_mock`) →
  tests-first on a local validator.
- Wallet-adapter SSR in Next 14 App Router → client-only provider, dynamic import
  with `ssr: false`.
- TS↔Rust hash divergence → shared canonical encoding + fixed-vector parity tests.

## 11. Done when

A judge can: connect a devnet wallet, claim GOLAZO from the faucet, stake into a
match's outcome bucket, watch the live SSE stream reach FT, see the Merkle proof
verify client-side, trigger a permissionless `settle` that **CPIs into
`validate_stat`**, and `claim` a pro-rata payout — all on devnet, with the TxLINE
pieces mocked but architected for a drop-in swap.
