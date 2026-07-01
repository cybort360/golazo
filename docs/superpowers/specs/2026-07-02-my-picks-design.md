# See your picks after selecting them

**Date:** 2026-07-02

## Problem

Between locking a pick and the match settling, a player's picks are invisible.
`Receipts` only shows *settled* picks (`WON`/`LOST`/`VOID`). If a player revisits a
match they already picked, the pick screen starts blank — it never loads what
they chose. There is no way to review your active/pending picks.

## Goal

Two surfaces, both scoped to the current (possibly ghost) user:

1. **Match page reflects existing picks.** Reopening a match shows the picks you
   already made.
2. **Dedicated "My Picks" list** at `/picks` — your active (`PENDING`) picks across
   all matches, separate from settled `Receipts`.

## Part A — Match page reflects picks

`MatchPickScreen` (mobile) and `MatchPickDesktop` fetch the user's picks for the
match on mount via the existing `GET /api/predict/pick?matchId=`.

- **Match still open (not kicked off):** pre-select the stored options so the
  player sees their choices. CTA changes to **"Update my picks · N selected"** when
  picks already exist (server upsert already supports editing before lock).
- **Match kicked off (locked):** the locked panel (added previously) also lists
  what you picked — read-only chips of `market title → your option` — instead of
  only "Picks locked".

Pure helper `existingPicksToState(picks)` maps stored `{marketId, optionId}` rows
to the screen's `Partial<Record<MarketId, string>>` selection state (unit-tested).

## Part B — Dedicated "My Picks" list

- **Route `/picks`** — client page, mirrors `/receipts`. Fetches active picks,
  renders grouped-by-match cards (soonest kickoff first). Each card: matchup +
  flags, live state pill / kickoff time, and the pick(s) made. Card links to the
  match page. Honest empty state ("No active picks yet · make your first pick").
- **Endpoint `GET /api/predict/picks`** → `{ ok, groups: ActivePickGroup[] }`,
  backed by `getUserActivePicks()` (server-only, `lib/predict/picks.ts`): joins
  `Prediction` (status `PENDING`) with `Match`, groups by match.
- **Pure builder** `lib/predict/picks-build.ts`: `groupActivePicks(rows)` groups
  rows by match, maps the match via `dbMatchToUi`, orders picks by the fixed
  market order and groups by soonest kickoff. Unit-tested.
- **Data seam:** add `getActivePicks(): Promise<ActivePickGroup[]>` to
  `PredictDataSource` + `dbBackedDataSource` (fetch `/api/predict/picks`).
- **Nav:** add "My picks" (`ListChecks` icon, `/picks`) to `SideNav` (desktop) and
  `BottomNav` (mobile, 5→6 tabs).

## Types (`lib/predict/types.ts`)

```ts
export interface ActivePick {
  pickId: string;
  marketId: MarketId;
  marketTitle: string;   // "Match winner"
  optionLabel: string;   // stored predictionLabel, e.g. "Over 2.5"
  createdAtMs: number;
}
export interface ActivePickGroup {
  match: Match;          // reuse the UI Match (via dbMatchToUi)
  picks: ActivePick[];   // fixed market order: winner, totals, btts, chaos
}
```

`MARKET_TITLES: Record<MarketId, string>` lives in `pick-rules.ts` (client-safe,
types-only) and is reused by `picks-build.ts`.

## Testing

- `groupActivePicks` — grouping, market ordering, kickoff ordering, empty input.
- `existingPicksToState` — maps rows, ignores unknown market ids.
- `MyPicks` component — renders groups + empty state.
- Existing suite stays green; typecheck + production build pass.

## Non-goals

- No change to settlement or Receipts semantics (still settled-only).
- No new persistence — reuses the existing `Prediction` table and pick endpoints.
