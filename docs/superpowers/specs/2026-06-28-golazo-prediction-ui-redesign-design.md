# Golazo UI Redesign — Verified Prediction Product

**Date:** 2026-06-28
**Status:** Approved (design); pending spec review → implementation plan
**Scope:** The front-end direction for the pivot from country-token trading to a
verified free-to-play football **prediction-league** product. Covers visual
language, navigation, and the four core screens of the prediction loop. Backend
(TxLINE integration, storage, resolver, schema) is tracked separately in the
Cairn backlog (tasks 40–61) and its own specs.

Relates to Cairn tasks: **46** (new landing UI), **53** (remove token UX),
**54** (reframe identity). Driven by the updated PRD ("Golazo Updated Direction
and PRD").

---

## 1. Goal & promise

Reposition Golazo's surface from "buy a team token" to **"prove you know ball."**
The first action a fan can take is a **pick**, not a wallet connection. Verification
(via TxLINE) is shown as **trust**, not technical homework. The UI must let a new
user make a pick in under 30 seconds and understand win/loss + verification without
reading anything technical (PRD §12.3).

Tagline used in-product: **"Make picks. Prove you know ball. Verify every result."**

---

## 2. Visual language — "Clean + Bold"

A clean, light, legible foundation carrying bold, high-energy football-culture
styling. Locked direction: **Electric Lime + ink black**, with Golazo green in a
supporting role.

**Palette**
- **Ink black** `#0a0a0a` — headers, hero strips, the proof "ticket", emphasis blocks.
- **Electric lime** `#d4ff3f` — primary accent: selected picks, live indicators,
  CTAs-on-dark, highlights, the user's own leaderboard row.
- **Golazo green** `#16a34a` — supporting/primary action on light surfaces
  (e.g. "Lock my picks"), positive/won states, points.
- **Surfaces** — light app background `#f8fafc`, white cards `#fff`,
  hairline borders `#e2e8f0`, soft shadows. Muted text `#64748b` / `#94a3b8`.

**Type** — heavy, tight headlines (font-weight 800–900, negative letter-spacing).
Bold, punchy. Tabular numerics for scores, points, ranks, countdowns.

**Components** — soft rounded cards (radius ~12–18px), pill buttons/segmented
controls, small uppercase tracked labels for section headers, ink hero strips for
match/league headers. Live state uses a lime dot/pulse.

**Reuse:** keep the existing Tailwind setup and component primitives where they
fit (Flag, LocalTime, Icon, share/OG pipeline); restyle to the new language rather
than rebuild from scratch.

---

## 3. Information architecture

Top-level navigation (4 sections):

1. **Home** — the hybrid dashboard (default landing).
2. **Matches** — full fixture list with live states, filterable by competition/day.
3. **Leagues** — your private leagues; create/join; per-league leaderboards.
4. **Leaderboard / Profile** — global board (P1) + your profile (accuracy, streak,
   badges, proof history).

The first action is always reachable without auth (ghost mode). Token-era
destinations (Tokens/teams, Prize Pool, Burns, Fantasy, Predict-as-was) are removed
from primary nav.

---

## 4. Screen designs

### 4.1 Home — hybrid dashboard

A single layout that serves both returning and first-time (ghost) users via
**smart empty states** — the structure never changes, empty zones become prompts.

Sections, top to bottom:
- **Headline** — "Make picks. **Prove you know ball.**" (lime highlight on the
  second clause).
- **Live now** — a prominent live/next match card with inline pick pills and the
  market row (Winner · O/U · BTTS · Corners · Chaos ⚡). Tapping opens the full
  pick screen (§4.2).
- **Your leagues** — standings summary (e.g. "The Lads · #2 of 8"). Empty state:
  "＋ Create or join a league."
- **Recent proof** — latest verified receipt chip ("✓ O2.5 WON +120 · Verified by
  TxLINE"). Empty state: "Make a pick to earn your first verified receipt."

### 4.2 Match → Pick screen

The core action surface. One match, all five markets on one screen.

- **Ink header strip** — competition/round, live status (lime "● LIVE 67'"), team
  flags + score, and a **picks-lock countdown** ("🔒 Picks lock in 02:14").
- **Markets**, stacked: Match winner (3-way), Total goals (O/U 2.5), BTTS (Yes/No),
  Total corners (O/U 8.5). Each is a segmented pill control; selected option fills
  lime (or ink). Corners renders only when the TxLINE stat is reliable; otherwise
  it is omitted / shown as market-void per PRD §9.
- **Chaos Pick — hero treatment (locked decision).** Visually separated as a black
  block with lime accent: "⚡ Chaos Pick — Goal after the 80th minute?" Yes/No.
  This is the signature differentiator and stays prominent.
- **Interaction:** select-then-confirm. Picks are chosen across markets, then
  committed with a single **"Lock my picks ▸"** button (green). Server enforces
  lock time.
- **Ghost line:** "Playing as guest · no signup needed — save your streak."

### 4.3 Proof receipt — two layers

The demo centerpiece. Verification visible as trust.

- **Layer 1 — Simple fan card (default, shareable).** A dark "ticket": GOLAZO
  wordmark + "✓ VERIFIED" badge, the prediction, a large result (**WON/LOST/VOID**)
  in lime, the final score with flags, **+points**, "Verified by TxLINE", and two
  actions: **Share receipt** and **View advanced proof ▾**. This dark ticket is the
  object shared to Telegram/Discord (via the existing OG/share pipeline).
- **Layer 2 — Advanced proof (inline expand, locked decision).** Unfolds in place
  from the same card. Fields (PRD §8.2): fixture ID, TxLINE match state, market,
  stat keys, raw payload reference, Merkle proof status, on-chain status, settlement
  timestamp, optional transaction link. **Optional fields (Merkle / on-chain / tx)
  render only when TxLINE actually provides them** — to be confirmed in P0-01.

### 4.4 Private league + leaderboard

The retention + viral hub.

- **Ink league header** — "Private league / The Lads", the user's rank ("#2/8" in
  lime), and a prominent **invite hook**: invite code (e.g. `LADS-42`) + **Share
  invite ▸**.
- **Scope toggle** — segmented **This week / All time**.
- **Ranked rows** — rank number, avatar/initials, name, and a secondary line with
  **accuracy % + streak 🔥**, points right-aligned (tabular). **The user's own row
  is pinned/highlighted** in ink + lime. Rows below the fold dim slightly.

---

## 5. Removing the token UX (task 53)

Pull the token-trading product out of the **core fan experience** without deleting
the code (it may return as compliance-gated Web3 rewards, PRD §11 Phase 3–4):

- `app/page.tsx` — replace the token homepage (GolazoCard, Top Movers, BurnsFeed,
  StatsStrip, group token tables) with the hybrid dashboard (§4.1).
- Remove buy/trade as a first action: $GOLAZO buy buttons, Jupiter links, token
  `[ticker]` buy CTAs out of the primary path; `SiteNav`/`SiteFooter` cleanup.
- Demote `/prize-pool`, burns feed, and token pages from primary nav.
- **Keep, but dormant:** `lib/burns*`, `lib/buyback*`, `lib/burnToken*`,
  `constants/tokens*`, the admin Burn panel, and the Solana wallet-adapter plumbing.
  Do not delete — they are reused by P1-22 (wallet mode) later.

## 6. Reframing identity & copy (task 54)

- Tagline everywhere: "Make picks. Prove you know ball. Verify every result."
- Messaging: prediction leagues, not token trading; "prove you know ball" as the
  promise.
- Generalize from World-Cup-only to **season-based** competitions (World Cup, UCL,
  EPL, AFCON, derby weekends) — leveraging the Competition-abstraction thinking in
  `planning/multi-competition-expansion.md`, applied to fixtures/markets.
- Update README, layout metadata, OG defaults, IntroModal, and the "Why Golazo"
  content to the prediction framing.

---

## 7. Dependencies & open items

- **TxLINE (P0-01)** — confirms which advanced-proof fields are real (Merkle /
  on-chain / tx), live-state vocabulary for the match header, and the stats behind
  Corners + Chaos Pick. Blocks final fidelity of §4.2/§4.3.
- **Storage (P0-02)** — leagues, predictions, settlements, append-only event log.
- **Match-state machine (P1-06)** — drives every status chip (NOT STARTED / LIVE n'
  / HT / FT / SUSPENDED / POSTPONED / VOID) and market-void rendering.

This UI work can proceed in parallel as restyled, data-shaped components against
mock data, then wire to real data as the backend lands.

---

## 8. Out of scope (this doc)

Backend/data architecture, the resolver, the schema, TxLINE ingestion, badges
(P1-17), global leaderboard build-out (P1-18), shareable profile (P1-19), advanced
proof explorer page (P1-20), sponsored pools (P1-21), wallet mode (P1-22).
Real-money wagering is out of scope entirely for the MVP (free-to-play, PRD §11).

---

## 9. Decisions locked in brainstorming

| Decision | Choice |
|----------|--------|
| Home center of gravity | Hybrid dashboard |
| First-timer / ghost | Same layout, smart empty states |
| Top nav | Home · Matches · Leagues · Leaderboard/Profile |
| Visual direction | Clean + Bold |
| Accent palette | Electric Lime + ink black (green supporting) |
| Pick screen | All 5 markets on one screen; select-then-confirm + Lock button |
| Chaos Pick | Kept as visual hero (black block, lime accent) |
| Proof receipt | Simple dark shareable fan card |
| Advanced proof | Inline expand (default), not a separate page |
| Leaderboard | Own row pinned/highlighted; This week / All time; accuracy + streak shown |
