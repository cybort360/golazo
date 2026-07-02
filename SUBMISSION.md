# Golazo: TxLINE Hackathon Submission

**Prove you know ball.** A verified football prediction platform powered by the
TxLINE live data + result-verification layer, settling on Solana devnet.

- **Live app:** https://golazo.fans
- **Repo:** https://github.com/cybort360/golazo
- **Network:** Solana **devnet** (no mainnet, no real money)

---

## Core idea

Most prediction apps ask you to *trust the house* on the result. Golazo doesn't.
Every match outcome is sourced from **TxLINE** and is independently verifiable:
in Free Picks the result carries a TxLINE proof receipt, and in Market Mode an
on-chain settlement only releases funds after a **Merkle proof of the stat is
validated on-chain**. The data layer is the source of truth; the UI just makes
it legible to football fans.

Two modes share one TxLINE data seam:

1. **Free Picks:** a free-to-play social prediction game. Pick Winner, Over/Under,
   BTTS, and the signature **Chaos Pick** ("goal after the 80th minute?", 2× points).
   Picks settle automatically against verified TxLINE finals; each settled pick
   becomes a shareable, verifiable **proof receipt**. Private leagues + global
   leaderboards drive the social loop.
2. **Market Mode** (devnet): YES/NO markets where users stake demo GOLAZO into an
   on-chain escrow. A keeper settles via a **Cross-Program Invocation into a TxLINE
   validation program**, and winners claim trustlessly.

---

## Technical highlights

- **Single provider-agnostic TxLINE seam** (`lib/txline/client.ts`): a `mock`
  client serves scripted World Cup fixtures and a `live` client consumes the real
  API. `TXLINE_MODE` flips between them; nothing downstream changes. (Mock mode
  also guarantees a clean demo even after matches end.)
- **Low-latency live via real SSE.** Live state is primed from the per-action
  snapshot, then kept current by consuming the TxLINE **Server-Sent Events**
  stream (`/api/scores/updates/{id}`), giving sub-second updates instead of polling.
- **Goal-minute extraction unlocks the Chaos market.** The snapshot only carries
  cumulative scores; we derive per-goal **minutes** from the SSE stream (by
  detecting cumulative-tally increases), persist them to an append-only event log,
  and resolve "goal after 80'" on real data, with an honest VOID if the goal log
  is incomplete.
- **Independent on-chain verification.** The proof view **recomputes the Merkle
  leaf → root in the browser** from the raw stats and **cross-checks it against the
  root committed on Solana**, with a link to the on-chain account. Don't trust the
  server; verify the bytes.
- **Custom on-chain settlement engine with CPI.** `golazo_predict::settle` does a
  CPI into `txline_mock::validate_stat`; funds release **only** on a verified
  Merkle proof. The TypeScript Merkle implementation is byte-compatible with the
  on-chain Rust so a proof built off-chain verifies on-chain.
- **Market consensus from the odds feed.** We surface TxLINE's demargined implied
  probabilities (1X2 + Over/Under 2.5) as a consensus bar on each match.
- **Compliance posture.** The internal TxLINE credit token is used **only** for
  data-authorization (the on-chain `subscribe`), never for staking or transfers.
  Market Mode settles in GOLAZO/SOL on devnet, never the TxL token, never real money.

**Stack:** Next.js 14 (App Router) · TypeScript · Postgres (Prisma) · Anchor /
Solana web3.js · deployed on Vercel (Neon Postgres), synced by a cron pinger.

---

## TxLINE endpoints used

| Endpoint | Method | How we use it |
|---|---|---|
| `/auth/guest/start` | POST | Mint a guest JWT (30-day) used as the `Bearer` token. Auto-acquired and refreshed on 401. |
| `/api/token/activate` | POST | Activate the data token after the on-chain `subscribe`; returned token is sent as the `X-Api-Token` header. |
| `/api/fixtures/snapshot` | GET | World Cup fixtures (teams, kickoff, orientation) → upserted as matches. |
| `/api/scores/snapshot/{fixtureId}` | GET | Per-action snapshot → current state/score/minute (phase from the `status` action's `StatusId`; scores from the numerically-keyed `Stats` map). Baseline live path + settle finals. |
| `/api/scores/updates/{fixtureId}` | GET (SSE) | `text/event-stream` of live actions → low-latency state + the per-goal minute log that powers the Chaos market. |
| `/api/odds/snapshot/{fixtureId}` | GET | Consensus odds (`1X2_PARTICIPANT_RESULT`, `OVERUNDER_PARTICIPANT_GOALS`) → demargined implied probabilities. |

**Access (devnet):** guest JWT → on-chain `subscribe(service_level, weeks)` on the
TxLINE program `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` (TxL mint is
Token-2022 `4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG`) → `/api/token/activate`.
Host: `https://txline-dev.txodds.com`.

**Our devnet programs:** `golazo_predict` `GJNVa5XpYWUaJnbxx4TmepNM4D9JDAoCSC2FCRmRWGA5`
· `txline_mock` (validation primitive) `Go73N2JanmNjxJz7rGdTcd1PzgTZCuM9uRC11jvQGV7w`.

---

## TxLINE API feedback

**What we liked most**
- **One normalized schema across competitions** made it easy to model fixtures,
  scores, and odds uniformly, so scaling from one match to the full tournament was
  just iterating fixtures.
- **Frictionless free access** for the World Cup tier, and a **guest JWT** that we
  could mint on demand and cache, with no heavyweight onboarding to start reading data.
- **The SSE stream** is genuinely low-latency and was the key to per-goal minutes
  (and therefore the Chaos market).
- **Demargined `Pct`** on the odds feed: getting clean implied probabilities
  out-of-the-box (summing to 100) saved us the de-vig math.
- The **on-chain `subscribe` + Merkle validation** model is a great fit for trustless
  settlement; the CPI shape made our custom settlement engine straightforward.

**Where we hit friction**
- **The live API deviated from the published OpenAPI spec.** Fields came back
  **PascalCase** (not camelCase), `GameState` was often stuck at `"scheduled"`
  mid-match (real phase had to be read from the `status` action's `StatusId`), and
  scores lived in a **numerically-keyed `Stats` map** (`"1"`=P1 goals, `"2"`=P2,
  `"7"/"8"`=corners). We had to probe the live devnet responses to map it correctly.
- **Goal minutes aren't in the snapshot:** only the SSE stream exposes them, so
  any historical/after-the-fact goal-time market needs the live stream captured.
- **Devnet specifics took trial and error:** the TxL mint is **Token-2022** (ATAs
  needed the Token-2022 program id), the devnet pricing matrix exposed a single
  service-level row, and `/api/token/activate` returns the token as a **bare string**
  rather than an object.
- **Empty bodies for not-started fixtures** (snapshot returns `[]` / empty): fine
  once handled, but worth documenting so clients tolerate it.

Net: once the real-vs-spec field mapping was understood, the data was reliable and
the proof/validation primitives were a pleasure to build on.

---

## Run locally

```bash
cp .env.example .env.local   # set DATABASE_URL; TXLINE_MODE=mock works with no creds
npm install
npm run db:deploy            # apply Prisma migrations
npm run dev                  # http://localhost:3000
```

Set `TXLINE_MODE=live` with `TXLINE_API_BASE` + `TXLINE_API_TOKEN` to consume the
real feed. Devnet only: no mainnet, no real-money wagering.
