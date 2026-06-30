# Golazo ⚽

**Make picks. Prove you know ball.**

Golazo is a verified football prediction platform. You call matches before
kick-off; every result is sourced and verified through **[TxLINE](https://txline.txodds.com)**
(live data + on-chain result verification), so outcomes are provable rather than
"trust the house." Built for the 2026 FIFA World Cup.

- **Live:** https://golazo.fans
- **Network:** Solana **devnet** — no mainnet, no real money

---

## Two ways to play

**🎮 Free Picks** — a free-to-play social prediction game. Pick the Winner,
Over/Under, Both Teams To Score, and the signature **Chaos Pick** (_"goal after
the 80th minute?"_ — 2× points). Picks settle automatically against verified
TxLINE finals, and every settled pick becomes a **shareable proof receipt**.
Create private leagues, climb the global leaderboard, build a public profile.

**🔗 Market Mode** _(devnet)_ — YES/NO markets where you stake demo GOLAZO into an
on-chain escrow. Settlement happens via a **Cross-Program Invocation into a TxLINE
validation program** — funds release only after a Merkle proof of the result is
verified on-chain. Winners claim trustlessly.

---

## Highlights

- **Verified, not trusted** — results come from TxLINE; settled picks carry a proof
  you can inspect.
- **Independent on-chain verification** — the proof view recomputes the Merkle
  leaf → root **in your browser** and cross-checks it against the root committed on
  Solana. Don't trust the server; verify the bytes.
- **Real-time** — live match state is primed from the snapshot and kept current via
  TxLINE's **SSE stream** (sub-second), which also yields per-goal minutes — the
  data behind the Chaos market.
- **Market consensus** — TxLINE's demargined odds shown as implied probabilities on
  each match.
- **One data seam, two backends** — a single provider-agnostic TxLINE interface
  with a scripted `mock` client and a `live` client; flip with `TXLINE_MODE`.

---

## How TxLINE powers it

The entire data + verification layer lives behind one seam (`lib/txline/`). We use
the fixtures, scores (snapshot + SSE), and odds feeds for live state and market
consensus, and the on-chain Merkle/`validate_stat` primitive for trustless
settlement.

See **[SUBMISSION.md](./SUBMISSION.md)** for the full endpoint list, devnet program
IDs, architecture notes, and our TxLINE API feedback.

---

## Tech stack

- **Next.js 14** (App Router) + **React 18**, **TypeScript** (strict)
- **Tailwind CSS**, **Phosphor** icons
- **Postgres** via **Prisma** (append-only TxLINE event log → derived match state)
- **Anchor / Solana web3.js** — `golazo_predict` (markets/escrow) + `txline_mock`
  (Merkle validation primitive) on devnet
- **Vitest** for the deterministic resolver/settlement/mapping logic
- Deployed on **Vercel** with **Neon** Postgres; live data kept fresh by a cron sync

---

## Run locally

```bash
cp .env.example .env.local   # TXLINE_MODE=mock needs no credentials
npm install
npm run db:deploy            # apply Prisma migrations (needs DATABASE_URL)
npm run dev                  # http://localhost:3000
npm test                     # run the test suite
```

Set `TXLINE_MODE=live` with `TXLINE_API_BASE` + `TXLINE_API_TOKEN` to consume the
real feed (see `.env.example`).

---

## Project layout

```
app/                Next.js routes (pages + API)
components/predict/  Free Picks UI (matches, picks, leagues, receipts, profiles)
components/markets/   Market Mode UI (wallet, staking, proof explorer)
lib/txline/         TxLINE seam: mock + live clients, SSE, Merkle, mappers
lib/predict/        ingestion, settlement, resolvers, leagues, profiles
lib/chain/          Solana program clients, PDAs, constants
anchor/             Anchor programs (golazo_predict, txline_mock)
```

---

_Devnet prototype. No real-money wagering or payouts. Prizes in any pool are
non-cash (merch / access / perks)._
