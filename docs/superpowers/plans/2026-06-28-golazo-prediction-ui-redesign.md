# Golazo Prediction UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Golazo's token-trading front-end with the verified prediction-league UI (hybrid home, match→pick, two-layer proof receipt, private league + leaderboard) against a typed mock data layer, and delete the token product from the codebase.

**Architecture:** A typed `PredictDataSource` seam (`lib/predict/`) is implemented now by an in-memory mock (`mockData.ts`); real TxLINE/storage swap in behind the same interface later. Pure logic (market building, state labels, formatting) lives in tested modules. UI is split into **presentational components** (`components/predict/*`, prop-driven, render-tested) and thin **page containers** (`app/*`) that load from the data source. Token code is removed only after the new home/nav stop referencing it, with typecheck/test gates between deletions.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript (strict), Tailwind CSS, Vitest + @testing-library/react (jsdom).

## Global Constraints

- **Next.js** 14.2.x, **React** 18, **TypeScript strict** — match existing config.
- **Path alias:** import via `@/...` (works in app and vitest).
- **Brand palette (exact):** ink `#0a0a0a`, neon lime `#d4ff3f`, supporting green `#16a34a`, app bg `#f8fafc`, card border `#e2e8f0`. Added to Tailwind as `ink` and `neon`.
- **Tagline (verbatim):** `Make picks. Prove you know ball. Verify every result.`
- **MVP markets (only):** `winner`, `totals` (O/U 2.5), `btts`, `chaos` (goal after 80'). No corners.
- **Match states (only):** `NOT_STARTED`, `LIVE`, `HT`, `FT`, `SUSPENDED`, `POSTPONED`, `VOID`.
- **Commits:** Conventional style, imperative. **Never** add Claude/AI attribution or `Co-Authored-By`. Trunk-based on `main`.
- **Test command:** `npm test` (vitest run). **Typecheck:** `npx tsc --noEmit`. **Lint:** `npm run lint`. **Build:** `npm run build`.
- **Token deletion is full** (design doc §5): delete code, do not keep dormant.
- Reference: `docs/superpowers/specs/2026-06-28-golazo-prediction-ui-redesign-design.md`.

---

## File Structure

**New — domain/logic (`lib/predict/`)**
- `types.ts` — all domain types + `PredictDataSource` interface.
- `markets.ts` — `buildMarkets(match)` → the 4 MVP markets for a match.
- `labels.ts` — `matchStateLabel`, `scoreLabel`, `formatPoints`, `formatAccuracy`.
- `mockData.ts` — fixtures + `mockDataSource` implementing `PredictDataSource`.
- `dataSource.ts` — exports the active `dataSource` (mock for now); the swap point.

**New — presentational components (`components/predict/`)**
- `MatchStatePill.tsx`, `MarketPicker.tsx`, `MatchPickScreen.tsx`,
  `ProofReceipt.tsx`, `LeagueLeaderboard.tsx`, `HomeDashboard.tsx`, `MatchListItem.tsx`.

**New — routes (`app/`)**
- `app/page.tsx` (replace), `app/matches/page.tsx`, `app/match/[id]/page.tsx`,
  `app/leagues/page.tsx`, `app/leagues/[code]/page.tsx`, `app/leaderboard/page.tsx` (replace),
  `app/r/[pickId]/page.tsx` (shareable receipt).

**Modified**
- `tailwind.config.ts` (tokens), `vitest.config.ts` + new `vitest.setup.ts` (jest-dom),
  `app/layout.tsx` (metadata/copy), `components/SiteNav.tsx`, `components/SiteFooter.tsx`.

**Deleted (Phase 4)** — see Tasks 14–16.

---

## Phase 0 — Foundations

### Task 1: Theme tokens + component-test setup

**Files:**
- Modify: `tailwind.config.ts`
- Create: `vitest.setup.ts`
- Modify: `vitest.config.ts`

**Interfaces:**
- Produces: Tailwind classes `bg-ink`, `text-ink`, `bg-neon`, `text-neon`, `border-neon`; jest-dom matchers (`toBeInTheDocument`, `toHaveClass`) available in all `*.test.tsx`.

- [ ] **Step 1: Add brand tokens to Tailwind**

In `tailwind.config.ts`, extend `theme.extend.colors`:

```ts
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: "#0a0a0a",
        neon: "#d4ff3f",
      },
```

- [ ] **Step 2: Create the jest-dom setup file**

Create `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Register the setup file in vitest**

In `vitest.config.ts`, add `setupFiles` to the `test` block:

```ts
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
  },
```

- [ ] **Step 4: Verify the suite still passes**

Run: `npm test`
Expected: PASS (existing suite unaffected; setup file loads without error).

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.ts vitest.config.ts vitest.setup.ts
git commit -m "chore: add brand tokens and jest-dom test setup"
```

---

### Task 2: Domain types + data-source seam

**Files:**
- Create: `lib/predict/types.ts`
- Create: `lib/predict/dataSource.ts` (stub, completed in Task 5)

**Interfaces:**
- Produces: all types below, plus `PredictDataSource`. Later tasks import these.

- [ ] **Step 1: Write the types**

Create `lib/predict/types.ts`:

```ts
export type MatchState =
  | "NOT_STARTED" | "LIVE" | "HT" | "FT" | "SUSPENDED" | "POSTPONED" | "VOID";

export interface MatchTeam {
  ticker: string;
  name: string;
  flagCode: string;
}

export interface Match {
  id: string;
  competition: string; // "World Cup"
  round: string;       // "Group J"
  kickoffMs: number;
  lockMs: number;      // picks lock at/after this
  state: MatchState;
  minute: number | null;
  home: MatchTeam;
  away: MatchTeam;
  homeScore: number | null;
  awayScore: number | null;
}

export type MarketId = "winner" | "totals" | "btts" | "chaos";

export interface MarketOption {
  id: string;
  label: string;
}

export interface Market {
  id: MarketId;
  title: string;        // "Match winner"
  question: string | null; // chaos: "Goal after the 80th minute?"
  options: MarketOption[];
  hero: boolean;        // chaos = true
}

export type PickResult = "PENDING" | "WON" | "LOST" | "VOID";

export interface ProofReceipt {
  pickId: string;
  predictionLabel: string; // "Over 2.5 goals"
  result: PickResult;
  home: MatchTeam;
  away: MatchTeam;
  homeScore: number;
  awayScore: number;
  points: number;
  // advanced proof
  fixtureId: string;
  matchState: MatchState;
  marketLabel: string;     // "total_goals · O2.5"
  statKeys: string;        // "home_g=2, away_g=1"
  payloadRef: string;      // "evt_8a3f…d91"
  merkleStatus: string | null;
  onChainStatus: string | null;
  settledAtMs: number;
  txUrl: string | null;
}

export interface LeagueMember {
  rank: number;
  userId: string;
  name: string;
  initials: string;
  points: number;
  accuracy: number; // 0..1
  streak: number;
  isYou: boolean;
}

export interface League {
  code: string;
  name: string;
  yourRank: number;
  memberCount: number;
  members: LeagueMember[]; // sorted by rank asc
}

export interface PredictDataSource {
  getMatches(): Promise<Match[]>;
  getMatch(id: string): Promise<Match | null>;
  getMyLeagues(): Promise<League[]>;
  getLeague(code: string): Promise<League | null>;
  getRecentReceipts(limit?: number): Promise<ProofReceipt[]>;
  getReceipt(pickId: string): Promise<ProofReceipt | null>;
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: PASS (no consumers yet).

- [ ] **Step 3: Commit**

```bash
git add lib/predict/types.ts
git commit -m "feat: add prediction domain types and data-source interface"
```

---

### Task 3: Market builder

**Files:**
- Create: `lib/predict/markets.ts`
- Test: `lib/predict/markets.test.ts`

**Interfaces:**
- Consumes: `Match`, `Market` from `@/lib/predict/types`.
- Produces: `buildMarkets(match: Match): Market[]` — returns exactly `[winner, totals, btts, chaos]`, in that order; `chaos.hero === true`; `winner.options` are `[home.ticker, "draw", away.ticker]`.

- [ ] **Step 1: Write the failing test**

Create `lib/predict/markets.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildMarkets } from "@/lib/predict/markets";
import type { Match } from "@/lib/predict/types";

const match: Match = {
  id: "GM041", competition: "World Cup", round: "Group J",
  kickoffMs: 0, lockMs: 0, state: "LIVE", minute: 67,
  home: { ticker: "ARG", name: "Argentina", flagCode: "ar" },
  away: { ticker: "ESP", name: "Spain", flagCode: "es" },
  homeScore: 1, awayScore: 1,
};

describe("buildMarkets", () => {
  it("returns the 4 MVP markets in order", () => {
    const ids = buildMarkets(match).map((m) => m.id);
    expect(ids).toEqual(["winner", "totals", "btts", "chaos"]);
  });

  it("winner options are home / draw / away by ticker", () => {
    const winner = buildMarkets(match)[0];
    expect(winner.options.map((o) => o.id)).toEqual(["ARG", "draw", "ESP"]);
    expect(winner.options.map((o) => o.label)).toEqual(["ARG", "Draw", "ESP"]);
  });

  it("marks chaos as the hero with a question", () => {
    const chaos = buildMarkets(match).find((m) => m.id === "chaos")!;
    expect(chaos.hero).toBe(true);
    expect(chaos.question).toBe("Goal after the 80th minute?");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- markets`
Expected: FAIL ("buildMarkets is not a function" / module not found).

- [ ] **Step 3: Implement**

Create `lib/predict/markets.ts`:

```ts
import type { Match, Market } from "@/lib/predict/types";

export function buildMarkets(match: Match): Market[] {
  return [
    {
      id: "winner",
      title: "Match winner",
      question: null,
      hero: false,
      options: [
        { id: match.home.ticker, label: match.home.ticker },
        { id: "draw", label: "Draw" },
        { id: match.away.ticker, label: match.away.ticker },
      ],
    },
    {
      id: "totals",
      title: "Total goals · 2.5",
      question: null,
      hero: false,
      options: [
        { id: "over", label: "Over 2.5" },
        { id: "under", label: "Under 2.5" },
      ],
    },
    {
      id: "btts",
      title: "Both teams to score",
      question: null,
      hero: false,
      options: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
    },
    {
      id: "chaos",
      title: "Chaos Pick",
      question: "Goal after the 80th minute?",
      hero: true,
      options: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- markets`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/predict/markets.ts lib/predict/markets.test.ts
git commit -m "feat: build the four MVP prediction markets for a match"
```

---

### Task 4: Labels & formatters

**Files:**
- Create: `lib/predict/labels.ts`
- Test: `lib/predict/labels.test.ts`

**Interfaces:**
- Consumes: `Match`, `MatchState` from `@/lib/predict/types`.
- Produces:
  - `matchStateLabel(match: Match): string` — `LIVE`→`"LIVE 67'"` (or `"LIVE"` if minute null), `HT`→`"HT"`, `FT`→`"FT"`, `SUSPENDED`→`"SUSPENDED"`, `POSTPONED`→`"POSTPONED"`, `VOID`→`"VOID"`, `NOT_STARTED`→`""`.
  - `scoreLabel(match: Match): string` — `"1 – 1"`, or `""` if either score null.
  - `formatPoints(n: number): string` — `1720`→`"1,720"`.
  - `formatAccuracy(frac: number): string` — `0.68`→`"68%"`.

- [ ] **Step 1: Write the failing test**

Create `lib/predict/labels.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  matchStateLabel, scoreLabel, formatPoints, formatAccuracy,
} from "@/lib/predict/labels";
import type { Match } from "@/lib/predict/types";

const base: Match = {
  id: "x", competition: "World Cup", round: "Group J",
  kickoffMs: 0, lockMs: 0, state: "LIVE", minute: 67,
  home: { ticker: "ARG", name: "Argentina", flagCode: "ar" },
  away: { ticker: "ESP", name: "Spain", flagCode: "es" },
  homeScore: 1, awayScore: 1,
};

describe("matchStateLabel", () => {
  it("shows live minute", () => {
    expect(matchStateLabel(base)).toBe("LIVE 67'");
  });
  it("falls back to LIVE without a minute", () => {
    expect(matchStateLabel({ ...base, minute: null })).toBe("LIVE");
  });
  it("maps terminal/paused states", () => {
    expect(matchStateLabel({ ...base, state: "FT" })).toBe("FT");
    expect(matchStateLabel({ ...base, state: "HT" })).toBe("HT");
    expect(matchStateLabel({ ...base, state: "POSTPONED" })).toBe("POSTPONED");
  });
  it("is empty before kickoff", () => {
    expect(matchStateLabel({ ...base, state: "NOT_STARTED" })).toBe("");
  });
});

describe("scoreLabel", () => {
  it("renders a score", () => expect(scoreLabel(base)).toBe("1 – 1"));
  it("is empty without scores", () =>
    expect(scoreLabel({ ...base, homeScore: null })).toBe(""));
});

describe("formatters", () => {
  it("formats points with thousands", () => expect(formatPoints(1720)).toBe("1,720"));
  it("formats accuracy as a percent", () => expect(formatAccuracy(0.68)).toBe("68%"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- labels`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `lib/predict/labels.ts`:

```ts
import type { Match } from "@/lib/predict/types";

export function matchStateLabel(match: Match): string {
  switch (match.state) {
    case "LIVE":
      return match.minute !== null ? `LIVE ${match.minute}'` : "LIVE";
    case "HT": return "HT";
    case "FT": return "FT";
    case "SUSPENDED": return "SUSPENDED";
    case "POSTPONED": return "POSTPONED";
    case "VOID": return "VOID";
    case "NOT_STARTED": return "";
  }
}

export function scoreLabel(match: Match): string {
  if (match.homeScore === null || match.awayScore === null) return "";
  return `${match.homeScore} – ${match.awayScore}`;
}

export function formatPoints(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatAccuracy(frac: number): string {
  return `${Math.round(frac * 100)}%`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- labels`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/predict/labels.ts lib/predict/labels.test.ts
git commit -m "feat: add match-state labels and prediction formatters"
```

---

### Task 5: Mock data source

**Files:**
- Create: `lib/predict/mockData.ts`
- Create: `lib/predict/dataSource.ts`
- Test: `lib/predict/mockData.test.ts`

**Interfaces:**
- Consumes: types from `@/lib/predict/types`.
- Produces: `mockDataSource: PredictDataSource` (in `mockData.ts`); `dataSource: PredictDataSource` re-export (in `dataSource.ts`). Also exports fixtures used by component tests: `FIXTURE_MATCH`, `FIXTURE_LEAGUE`, `FIXTURE_RECEIPT`.

- [ ] **Step 1: Write the failing test**

Create `lib/predict/mockData.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mockDataSource } from "@/lib/predict/mockData";

describe("mockDataSource", () => {
  it("returns matches with at least one live game", async () => {
    const matches = await mockDataSource.getMatches();
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.state === "LIVE")).toBe(true);
  });
  it("looks up a match by id", async () => {
    const all = await mockDataSource.getMatches();
    const one = await mockDataSource.getMatch(all[0].id);
    expect(one?.id).toBe(all[0].id);
    expect(await mockDataSource.getMatch("nope")).toBeNull();
  });
  it("returns a league with a pinned 'you' row", async () => {
    const leagues = await mockDataSource.getMyLeagues();
    const me = leagues[0].members.find((m) => m.isYou);
    expect(me).toBeTruthy();
  });
  it("returns recent receipts capped by limit", async () => {
    const r = await mockDataSource.getRecentReceipts(1);
    expect(r.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- mockData`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the mock**

Create `lib/predict/mockData.ts`:

```ts
import type {
  Match, League, ProofReceipt, PredictDataSource,
} from "@/lib/predict/types";

const ARG = { ticker: "ARG", name: "Argentina", flagCode: "ar" };
const ESP = { ticker: "ESP", name: "Spain", flagCode: "es" };
const ENG = { ticker: "ENG", name: "England", flagCode: "gb-eng" };
const FRA = { ticker: "FRA", name: "France", flagCode: "fr" };

const HOUR = 3_600_000;

export const FIXTURE_MATCH: Match = {
  id: "GM041", competition: "World Cup", round: "Group J",
  kickoffMs: Date.now() - HOUR, lockMs: Date.now() + 2 * 60_000,
  state: "LIVE", minute: 67, home: ARG, away: ESP, homeScore: 1, awayScore: 1,
};

const MATCHES: Match[] = [
  FIXTURE_MATCH,
  {
    id: "GM042", competition: "World Cup", round: "Group L",
    kickoffMs: Date.now() + 3 * HOUR, lockMs: Date.now() + 3 * HOUR,
    state: "NOT_STARTED", minute: null, home: ENG, away: FRA,
    homeScore: null, awayScore: null,
  },
];

export const FIXTURE_LEAGUE: League = {
  code: "LADS-42", name: "The Lads", yourRank: 2, memberCount: 8,
  members: [
    { rank: 1, userId: "jk", name: "jaykay", initials: "JK", points: 1840, accuracy: 0.71, streak: 5, isYou: false },
    { rank: 2, userId: "yo", name: "you", initials: "YO", points: 1720, accuracy: 0.68, streak: 3, isYou: true },
    { rank: 3, userId: "sm", name: "sammo", initials: "SM", points: 1655, accuracy: 0.64, streak: 1, isYou: false },
    { rank: 4, userId: "dv", name: "davo", initials: "DV", points: 1510, accuracy: 0.59, streak: 0, isYou: false },
  ],
};

export const FIXTURE_RECEIPT: ProofReceipt = {
  pickId: "pk_1", predictionLabel: "Over 2.5 goals", result: "WON",
  home: ARG, away: ESP, homeScore: 2, awayScore: 1, points: 120,
  fixtureId: "wc26_GM041", matchState: "FT", marketLabel: "total_goals · O2.5",
  statKeys: "home_g=2, away_g=1", payloadRef: "evt_8a3f…d91",
  merkleStatus: "root 0x4c…e2", onChainStatus: "confirmed",
  settledAtMs: Date.UTC(2026, 5, 22, 22, 51, 7), txUrl: "https://solscan.io/tx/5Xy…Qk2",
};

const RECEIPTS: ProofReceipt[] = [FIXTURE_RECEIPT];
const LEAGUES: League[] = [FIXTURE_LEAGUE];

export const mockDataSource: PredictDataSource = {
  async getMatches() { return MATCHES; },
  async getMatch(id) { return MATCHES.find((m) => m.id === id) ?? null; },
  async getMyLeagues() { return LEAGUES; },
  async getLeague(code) { return LEAGUES.find((l) => l.code === code) ?? null; },
  async getRecentReceipts(limit = 10) { return RECEIPTS.slice(0, limit); },
  async getReceipt(pickId) { return RECEIPTS.find((r) => r.pickId === pickId) ?? null; },
};
```

- [ ] **Step 4: Create the swap point**

Create `lib/predict/dataSource.ts`:

```ts
// Single import site for screens. Swap `mockDataSource` for the real TxLINE/DB
// source here once it exists — nothing else changes.
import { mockDataSource } from "@/lib/predict/mockData";
import type { PredictDataSource } from "@/lib/predict/types";

export const dataSource: PredictDataSource = mockDataSource;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- mockData`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/predict/mockData.ts lib/predict/dataSource.ts lib/predict/mockData.test.ts
git commit -m "feat: add mock prediction data source and fixtures"
```

---

## Phase 1 — Shared presentational components

### Task 6: MatchStatePill

**Files:**
- Create: `components/predict/MatchStatePill.tsx`
- Test: `components/predict/MatchStatePill.test.tsx`

**Interfaces:**
- Consumes: `Match` from `@/lib/predict/types`; `matchStateLabel` from `@/lib/predict/labels`.
- Produces: `export default function MatchStatePill({ match }: { match: Match })`. Renders nothing when label is empty; lime dot + label when live/paused.

- [ ] **Step 1: Write the failing test**

Create `components/predict/MatchStatePill.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MatchStatePill from "@/components/predict/MatchStatePill";
import { FIXTURE_MATCH } from "@/lib/predict/mockData";

describe("MatchStatePill", () => {
  it("shows the live minute", () => {
    render(<MatchStatePill match={FIXTURE_MATCH} />);
    expect(screen.getByText("LIVE 67'")).toBeInTheDocument();
  });
  it("renders nothing before kickoff", () => {
    const { container } = render(
      <MatchStatePill match={{ ...FIXTURE_MATCH, state: "NOT_STARTED" }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- MatchStatePill`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `components/predict/MatchStatePill.tsx`:

```tsx
import type { Match } from "@/lib/predict/types";
import { matchStateLabel } from "@/lib/predict/labels";

export default function MatchStatePill({ match }: { match: Match }) {
  const label = matchStateLabel(match);
  if (!label) return null;
  const live = match.state === "LIVE";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-green-700">
      {live && <span className="h-1.5 w-1.5 rounded-full bg-neon ring-2 ring-green-500/40" />}
      {label}
    </span>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- MatchStatePill`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/predict/MatchStatePill.tsx components/predict/MatchStatePill.test.tsx
git commit -m "feat: add MatchStatePill component"
```

---

### Task 7: MarketPicker (segmented control)

**Files:**
- Create: `components/predict/MarketPicker.tsx`
- Test: `components/predict/MarketPicker.test.tsx`

**Interfaces:**
- Consumes: `Market` from `@/lib/predict/types`.
- Produces: `export default function MarketPicker({ market, selected, onSelect }: { market: Market; selected: string | null; onSelect: (optionId: string) => void })`. Renders the title (and question for hero), one button per option; selected option gets neon fill; hero market wraps in an ink block.

- [ ] **Step 1: Write the failing test**

Create `components/predict/MarketPicker.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MarketPicker from "@/components/predict/MarketPicker";
import { buildMarkets } from "@/lib/predict/markets";
import { FIXTURE_MATCH } from "@/lib/predict/mockData";

const [winner, , , chaos] = buildMarkets(FIXTURE_MATCH);

describe("MarketPicker", () => {
  it("fires onSelect with the option id", () => {
    const onSelect = vi.fn();
    render(<MarketPicker market={winner} selected={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Draw" }));
    expect(onSelect).toHaveBeenCalledWith("draw");
  });
  it("marks the selected option pressed", () => {
    render(<MarketPicker market={winner} selected="ARG" onSelect={() => {}} />);
    expect(screen.getByRole("button", { name: "ARG" })).toHaveAttribute("aria-pressed", "true");
  });
  it("shows the chaos question", () => {
    render(<MarketPicker market={chaos} selected={null} onSelect={() => {}} />);
    expect(screen.getByText("Goal after the 80th minute?")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- MarketPicker`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `components/predict/MarketPicker.tsx`:

```tsx
"use client";

import type { Market } from "@/lib/predict/types";

export default function MarketPicker({
  market, selected, onSelect,
}: {
  market: Market;
  selected: string | null;
  onSelect: (optionId: string) => void;
}) {
  const hero = market.hero;
  return (
    <div className={hero ? "rounded-2xl bg-ink p-3" : ""}>
      <div className={`mb-1.5 text-[10px] font-black uppercase tracking-widest ${hero ? "text-neon" : "text-slate-500"}`}>
        {hero ? "⚡ " : ""}{market.title}
      </div>
      {market.question && (
        <div className="mb-2 text-sm font-extrabold text-white">{market.question}</div>
      )}
      <div className="flex gap-1.5">
        {market.options.map((opt) => {
          const active = selected === opt.id;
          const base = "flex-1 rounded-xl px-3 py-2.5 text-center text-xs font-extrabold transition-colors";
          const cls = active
            ? "bg-neon text-ink"
            : hero
              ? "bg-[#1f1f1f] text-neutral-300"
              : "border border-[#e2e8f0] bg-white text-slate-600 hover:border-slate-300";
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(opt.id)}
              className={`${base} ${cls}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- MarketPicker`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/predict/MarketPicker.tsx components/predict/MarketPicker.test.tsx
git commit -m "feat: add MarketPicker segmented control"
```

---

## Phase 2 — Screens

### Task 8: Match → Pick screen

**Files:**
- Create: `components/predict/MatchPickScreen.tsx`
- Test: `components/predict/MatchPickScreen.test.tsx`
- Create: `app/match/[id]/page.tsx`

**Interfaces:**
- Consumes: `Match` from types; `buildMarkets`; `MarketPicker`; `MatchStatePill`; `scoreLabel`; `dataSource`.
- Produces: `export default function MatchPickScreen({ match }: { match: Match })` — presentational; manages local pick selections; shows lock button labelled with the count of picks made and the ghost line.

- [ ] **Step 1: Write the failing test**

Create `components/predict/MatchPickScreen.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MatchPickScreen from "@/components/predict/MatchPickScreen";
import { FIXTURE_MATCH } from "@/lib/predict/mockData";

describe("MatchPickScreen", () => {
  it("shows the matchup, all four markets, and the ghost line", () => {
    render(<MatchPickScreen match={FIXTURE_MATCH} />);
    expect(screen.getByText("Match winner")).toBeInTheDocument();
    expect(screen.getByText("Total goals · 2.5")).toBeInTheDocument();
    expect(screen.getByText("Both teams to score")).toBeInTheDocument();
    expect(screen.getByText("Chaos Pick")).toBeInTheDocument();
    expect(screen.getByText(/no signup needed/i)).toBeInTheDocument();
  });
  it("counts picks in the lock button as they are made", () => {
    render(<MatchPickScreen match={FIXTURE_MATCH} />);
    expect(screen.getByRole("button", { name: /lock my 0 picks/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ARG" }));
    expect(screen.getByRole("button", { name: /lock my 1 pick/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- MatchPickScreen`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the component**

Create `components/predict/MatchPickScreen.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { Match, MarketId } from "@/lib/predict/types";
import { buildMarkets } from "@/lib/predict/markets";
import { scoreLabel, matchStateLabel } from "@/lib/predict/labels";
import MarketPicker from "@/components/predict/MarketPicker";

export default function MatchPickScreen({ match }: { match: Match }) {
  const markets = buildMarkets(match);
  const [picks, setPicks] = useState<Partial<Record<MarketId, string>>>({});
  const select = (id: MarketId, optionId: string) =>
    setPicks((p) => ({ ...p, [id]: optionId }));

  const count = Object.keys(picks).length;
  const liveLabel = matchStateLabel(match);

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-3xl border border-[#e2e8f0] bg-[#f8fafc] shadow-card-md">
      <div className="bg-ink px-5 py-4 text-white">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
          <span className="text-neutral-400">{match.competition} · {match.round}</span>
          {liveLabel && <span className="text-neon">● {liveLabel}</span>}
        </div>
        <div className="mt-2.5 flex items-center justify-center gap-5">
          <div className="text-center"><div className="text-base font-black">{match.home.ticker}</div></div>
          <div className="text-2xl font-black tracking-tight">{scoreLabel(match) || "vs"}</div>
          <div className="text-center"><div className="text-base font-black">{match.away.ticker}</div></div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-5 pt-4">
        {markets.map((m) => (
          <MarketPicker
            key={m.id}
            market={m}
            selected={picks[m.id] ?? null}
            onSelect={(opt) => select(m.id, opt)}
          />
        ))}

        <button
          type="button"
          className="mt-1 rounded-2xl bg-green-600 px-4 py-3.5 text-center text-sm font-black text-white"
        >
          Lock my {count} pick{count === 1 ? "" : "s"} ▸
        </button>
        <p className="text-center text-xs text-slate-400">
          Playing as guest · no signup needed —{" "}
          <span className="font-bold text-green-600">save your streak</span>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- MatchPickScreen`
Expected: PASS (2 tests).

- [ ] **Step 5: Add the route container**

Create `app/match/[id]/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import type { Match } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import MatchPickScreen from "@/components/predict/MatchPickScreen";

export default function MatchPage({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<Match | null | undefined>(undefined);
  useEffect(() => {
    void dataSource.getMatch(params.id).then(setMatch);
  }, [params.id]);

  if (match === undefined) {
    return <div className="mx-auto max-w-md px-4 py-10 text-center text-slate-400">Loading…</div>;
  }
  if (match === null) return notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <MatchPickScreen match={match} />
    </div>
  );
}
```

- [ ] **Step 6: Verify typecheck + tests**

Run: `npx tsc --noEmit && npm test -- MatchPickScreen`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/predict/MatchPickScreen.tsx components/predict/MatchPickScreen.test.tsx app/match
git commit -m "feat: add match pick screen with the four MVP markets"
```

---

### Task 9: Proof receipt (two layers) + shareable route

**Files:**
- Create: `components/predict/ProofReceipt.tsx`
- Test: `components/predict/ProofReceipt.test.tsx`
- Create: `app/r/[pickId]/page.tsx`

**Interfaces:**
- Consumes: `ProofReceipt` type; `dataSource`.
- Produces: `export default function ProofReceipt({ receipt }: { receipt: ProofReceipt })` — dark fan card; "View advanced proof" toggle reveals the proof rows inline; optional rows (merkle/on-chain/tx) render only when non-null.

- [ ] **Step 1: Write the failing test**

Create `components/predict/ProofReceipt.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProofReceipt from "@/components/predict/ProofReceipt";
import { FIXTURE_RECEIPT } from "@/lib/predict/mockData";

describe("ProofReceipt", () => {
  it("shows the simple fan card by default", () => {
    render(<ProofReceipt receipt={FIXTURE_RECEIPT} />);
    expect(screen.getByText("WON")).toBeInTheDocument();
    expect(screen.getByText("+120 pts")).toBeInTheDocument();
    expect(screen.getByText(/Verified by/)).toBeInTheDocument();
    expect(screen.queryByText("Fixture ID")).not.toBeInTheDocument();
  });
  it("reveals advanced proof on toggle", () => {
    render(<ProofReceipt receipt={FIXTURE_RECEIPT} />);
    fireEvent.click(screen.getByRole("button", { name: /advanced proof/i }));
    expect(screen.getByText("Fixture ID")).toBeInTheDocument();
    expect(screen.getByText("wc26_GM041")).toBeInTheDocument();
  });
  it("hides optional rows when null", () => {
    render(<ProofReceipt receipt={{ ...FIXTURE_RECEIPT, txUrl: null }} />);
    fireEvent.click(screen.getByRole("button", { name: /advanced proof/i }));
    expect(screen.queryByText("Transaction")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ProofReceipt`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `components/predict/ProofReceipt.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { ProofReceipt as Receipt } from "@/lib/predict/types";
import { formatPoints } from "@/lib/predict/labels";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export default function ProofReceipt({ receipt }: { receipt: Receipt }) {
  const [open, setOpen] = useState(false);
  const score = `${receipt.home.ticker} ${receipt.homeScore} – ${receipt.awayScore} ${receipt.away.ticker}`;
  return (
    <div className="mx-auto max-w-xs overflow-hidden rounded-3xl bg-ink shadow-card-md">
      <div className="flex items-center justify-between px-5 pt-4">
        <span className="font-black tracking-tight text-neon">GOLAZO</span>
        <span className="rounded-full bg-neon px-2 py-0.5 text-[9px] font-black tracking-wider text-ink">✓ VERIFIED</span>
      </div>
      <div className="px-5 pb-3 pt-1.5 text-center">
        <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{receipt.predictionLabel}</div>
        <div className="my-1 text-4xl font-black tracking-tight text-neon">{receipt.result}</div>
        <div className="text-sm font-extrabold text-white">{score}</div>
        <div className="mt-2.5 inline-block rounded-full bg-green-600 px-3.5 py-1 text-sm font-black text-white">
          +{formatPoints(receipt.points)} pts
        </div>
      </div>
      <div className="bg-[#1f1f1f] px-5 py-2.5 text-center text-[10px] text-neutral-400">
        Verified by <span className="font-extrabold text-neon">TxLINE</span>
      </div>
      <div className="flex gap-2 px-4 py-3">
        <button type="button" className="flex-1 rounded-xl bg-neon py-2.5 text-xs font-black text-ink">Share receipt</button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 rounded-xl bg-neutral-800 py-2.5 text-xs font-bold text-neutral-200"
        >
          {open ? "Hide proof ▴" : "View advanced proof ▾"}
        </button>
      </div>
      {open && (
        <div className="mx-4 mb-4 rounded-xl bg-white px-3 py-2 text-[11px] text-slate-900">
          <Row label="Fixture ID" value={receipt.fixtureId} />
          <Row label="Match state" value={receipt.matchState} />
          <Row label="Market" value={receipt.marketLabel} />
          <Row label="Stat keys" value={receipt.statKeys} />
          <Row label="Payload ref" value={receipt.payloadRef} />
          {receipt.merkleStatus && <Row label="Merkle proof" value={receipt.merkleStatus} />}
          {receipt.onChainStatus && <Row label="On-chain" value={receipt.onChainStatus} />}
          <Row label="Settled at" value={new Date(receipt.settledAtMs).toISOString().slice(11, 19) + " UTC"} />
          {receipt.txUrl && <Row label="Transaction" value="view ↗" />}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ProofReceipt`
Expected: PASS (3 tests).

- [ ] **Step 5: Add the shareable route**

Create `app/r/[pickId]/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import type { ProofReceipt as Receipt } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import ProofReceipt from "@/components/predict/ProofReceipt";

export default function ReceiptPage({ params }: { params: { pickId: string } }) {
  const [receipt, setReceipt] = useState<Receipt | null | undefined>(undefined);
  useEffect(() => {
    void dataSource.getReceipt(params.pickId).then(setReceipt);
  }, [params.pickId]);

  if (receipt === undefined) {
    return <div className="px-4 py-10 text-center text-slate-400">Loading…</div>;
  }
  if (receipt === null) return notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
      <ProofReceipt receipt={receipt} />
    </div>
  );
}
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && npm test -- ProofReceipt`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/predict/ProofReceipt.tsx components/predict/ProofReceipt.test.tsx app/r
git commit -m "feat: add two-layer proof receipt and shareable route"
```

---

### Task 10: League leaderboard + routes

**Files:**
- Create: `components/predict/LeagueLeaderboard.tsx`
- Test: `components/predict/LeagueLeaderboard.test.tsx`
- Create: `app/leagues/page.tsx`
- Create: `app/leagues/[code]/page.tsx`

**Interfaces:**
- Consumes: `League` type; `dataSource`; `formatPoints`, `formatAccuracy`.
- Produces: `export default function LeagueLeaderboard({ league }: { league: League })` — header with rank + invite code + share button; This week / All time toggle (visual only for MVP); rows with the "you" row highlighted (`data-you` attr) and accuracy + streak shown.

- [ ] **Step 1: Write the failing test**

Create `components/predict/LeagueLeaderboard.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LeagueLeaderboard from "@/components/predict/LeagueLeaderboard";
import { FIXTURE_LEAGUE } from "@/lib/predict/mockData";

describe("LeagueLeaderboard", () => {
  it("renders the invite code and the user's rank", () => {
    render(<LeagueLeaderboard league={FIXTURE_LEAGUE} />);
    expect(screen.getByText("LADS-42")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
  });
  it("highlights the you row and shows accuracy", () => {
    render(<LeagueLeaderboard league={FIXTURE_LEAGUE} />);
    const you = screen.getByTestId("row-yo");
    expect(you).toHaveAttribute("data-you", "true");
    expect(screen.getByText("68% accuracy · 3🔥")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- LeagueLeaderboard`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `components/predict/LeagueLeaderboard.tsx`:

```tsx
import type { League } from "@/lib/predict/types";
import { formatPoints, formatAccuracy } from "@/lib/predict/labels";

export default function LeagueLeaderboard({ league }: { league: League }) {
  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-3xl border border-[#e2e8f0] bg-[#f8fafc] shadow-card-md">
      <div className="bg-ink px-5 py-4 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Private league</div>
            <div className="text-lg font-black">{league.name} ⚽</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-neutral-400">Your rank</div>
            <div className="text-xl font-black text-neon">
              #{league.yourRank}<span className="text-xs font-bold text-neutral-500">/{league.memberCount}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-[#1f1f1f] px-3 py-2">
          <span className="text-xs text-neutral-300">
            Invite code <span className="font-mono font-black tracking-widest text-neon">{league.code}</span>
          </span>
          <button type="button" className="rounded-full bg-neon px-2.5 py-1 text-[10px] font-black text-ink">Share invite ▸</button>
        </div>
      </div>

      <div className="flex gap-1.5 px-4 pb-1 pt-3">
        <button type="button" className="rounded-full bg-ink px-3 py-1.5 text-xs font-extrabold text-white">This week</button>
        <button type="button" className="rounded-full border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-bold text-slate-500">All time</button>
      </div>

      <div className="flex flex-col gap-1.5 px-4 pb-5 pt-2">
        {league.members.map((m) => (
          <div
            key={m.userId}
            data-testid={`row-${m.userId}`}
            data-you={m.isYou}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${
              m.isYou ? "bg-ink text-white" : "border border-[#e2e8f0] bg-white"
            }`}
          >
            <span className={`w-5 text-sm font-black ${m.isYou ? "text-neon" : "text-ink"}`}>{m.rank}</span>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black ${
              m.isYou ? "bg-green-600 text-white" : "bg-slate-200 text-slate-600"
            }`}>{m.initials}</span>
            <div className="flex-1">
              <div className={`text-sm font-extrabold ${m.isYou ? "text-white" : "text-slate-900"}`}>{m.name}</div>
              <div className={`text-[10px] ${m.isYou ? "text-neutral-400" : "text-slate-400"}`}>
                {formatAccuracy(m.accuracy)} accuracy · {m.streak}🔥
              </div>
            </div>
            <span className={`text-sm font-black tabular-nums ${m.isYou ? "text-neon" : "text-ink"}`}>
              {formatPoints(m.points)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- LeagueLeaderboard`
Expected: PASS (2 tests).

- [ ] **Step 5: Add the league routes**

Create `app/leagues/[code]/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import type { League } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import LeagueLeaderboard from "@/components/predict/LeagueLeaderboard";

export default function LeaguePage({ params }: { params: { code: string } }) {
  const [league, setLeague] = useState<League | null | undefined>(undefined);
  useEffect(() => {
    void dataSource.getLeague(params.code).then(setLeague);
  }, [params.code]);

  if (league === undefined) return <div className="px-4 py-10 text-center text-slate-400">Loading…</div>;
  if (league === null) return notFound();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <LeagueLeaderboard league={league} />
    </div>
  );
}
```

Create `app/leagues/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { League } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[] | null>(null);
  useEffect(() => {
    void dataSource.getMyLeagues().then(setLeagues);
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-xl font-black tracking-tight">Your leagues</h1>
      {leagues === null ? (
        <p className="text-slate-400">Loading…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {leagues.map((l) => (
            <Link
              key={l.code}
              href={`/leagues/${l.code}`}
              className="flex items-center justify-between rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3 shadow-card hover:border-slate-300"
            >
              <span className="font-extrabold">{l.name}</span>
              <span className="text-sm font-bold text-slate-500">#{l.yourRank} of {l.memberCount}</span>
            </Link>
          ))}
          <button type="button" className="rounded-2xl bg-ink px-4 py-3 text-sm font-black text-neon">
            ＋ Create or join a league
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && npm test -- LeagueLeaderboard`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/predict/LeagueLeaderboard.tsx components/predict/LeagueLeaderboard.test.tsx app/leagues
git commit -m "feat: add private league leaderboard and league routes"
```

---

### Task 11: Match list item + Matches page

**Files:**
- Create: `components/predict/MatchListItem.tsx`
- Test: `components/predict/MatchListItem.test.tsx`
- Create: `app/matches/page.tsx`

**Interfaces:**
- Consumes: `Match`; `MatchStatePill`; `scoreLabel`; `LocalTime` (`@/components/LocalTime`).
- Produces: `export default function MatchListItem({ match }: { match: Match })` — a link to `/match/{id}` showing teams, state/score or kickoff, and a "Pick ▸" affordance.

- [ ] **Step 1: Write the failing test**

Create `components/predict/MatchListItem.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MatchListItem from "@/components/predict/MatchListItem";
import { FIXTURE_MATCH } from "@/lib/predict/mockData";

describe("MatchListItem", () => {
  it("links to the match pick screen", () => {
    render(<MatchListItem match={FIXTURE_MATCH} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/match/GM041");
    expect(screen.getByText(/ARG/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- MatchListItem`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `components/predict/MatchListItem.tsx`:

```tsx
import Link from "next/link";
import type { Match } from "@/lib/predict/types";
import { scoreLabel } from "@/lib/predict/labels";
import { LocalTime } from "@/components/LocalTime";
import MatchStatePill from "@/components/predict/MatchStatePill";

export default function MatchListItem({ match }: { match: Match }) {
  const score = scoreLabel(match);
  const upcoming = match.state === "NOT_STARTED";
  return (
    <Link
      href={`/match/${match.id}`}
      className="flex items-center justify-between gap-3 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3 shadow-card hover:border-slate-300"
    >
      <div className="min-w-0">
        <div className="text-sm font-extrabold text-slate-900">
          {match.home.ticker} <span className="text-slate-300">vs</span> {match.away.ticker}
        </div>
        <div className="mt-0.5 text-xs text-slate-400">
          {upcoming ? (
            <LocalTime
              date={new Date(match.kickoffMs).toISOString().slice(0, 10)}
              time={new Date(match.kickoffMs).toISOString().slice(11, 16)}
            />
          ) : (
            <span className="inline-flex items-center gap-2">
              <MatchStatePill match={match} />
              {score && <span className="font-bold text-slate-600">{score}</span>}
            </span>
          )}
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-neon px-3 py-1.5 text-xs font-black text-ink">Pick ▸</span>
    </Link>
  );
}
```

> Note: `LocalTime` (`components/LocalTime.tsx`) takes `date` ("YYYY-MM-DD") and `time` ("HH:MM") props — confirm its signature when implementing; if it differs, pass a single formatted string instead.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- MatchListItem`
Expected: PASS.

- [ ] **Step 5: Add the Matches page**

Create `app/matches/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { Match } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import MatchListItem from "@/components/predict/MatchListItem";

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[] | null>(null);
  useEffect(() => {
    void dataSource.getMatches().then(setMatches);
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-xl font-black tracking-tight">Matches</h1>
      {matches === null ? (
        <p className="text-slate-400">Loading…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {matches.map((m) => <MatchListItem key={m.id} match={m} />)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Verify + commit**

Run: `npx tsc --noEmit && npm test -- MatchListItem`
Expected: PASS.

```bash
git add components/predict/MatchListItem.tsx components/predict/MatchListItem.test.tsx app/matches
git commit -m "feat: add match list item and Matches page"
```

---

### Task 12: Home dashboard + replace `app/page.tsx`

**Files:**
- Create: `components/predict/HomeDashboard.tsx`
- Test: `components/predict/HomeDashboard.test.tsx`
- Modify (replace): `app/page.tsx`

**Interfaces:**
- Consumes: `Match`, `League`, `ProofReceipt`; `MatchListItem`; `formatPoints`.
- Produces: `export default function HomeDashboard({ liveMatches, leagues, receipts }: { liveMatches: Match[]; leagues: League[]; receipts: ProofReceipt[] })` — the tagline, Live now (matches or empty prompt), Your leagues (summary or "create/join" empty), Recent proof (chip or "make a pick" empty).

- [ ] **Step 1: Write the failing test**

Create `components/predict/HomeDashboard.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HomeDashboard from "@/components/predict/HomeDashboard";
import { FIXTURE_MATCH, FIXTURE_LEAGUE, FIXTURE_RECEIPT } from "@/lib/predict/mockData";

describe("HomeDashboard", () => {
  it("shows the tagline and populated sections", () => {
    render(<HomeDashboard liveMatches={[FIXTURE_MATCH]} leagues={[FIXTURE_LEAGUE]} receipts={[FIXTURE_RECEIPT]} />);
    expect(screen.getByText(/Prove you know ball/i)).toBeInTheDocument();
    expect(screen.getByText("The Lads")).toBeInTheDocument();
    expect(screen.getByText(/O2.5 WON/)).toBeInTheDocument();
  });
  it("shows empty prompts for a first-time visitor", () => {
    render(<HomeDashboard liveMatches={[]} leagues={[]} receipts={[]} />);
    expect(screen.getByText(/Create or join a league/i)).toBeInTheDocument();
    expect(screen.getByText(/Make a pick to earn/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- HomeDashboard`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `components/predict/HomeDashboard.tsx`:

```tsx
import Link from "next/link";
import type { Match, League, ProofReceipt } from "@/lib/predict/types";
import { formatPoints } from "@/lib/predict/labels";
import MatchListItem from "@/components/predict/MatchListItem";

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">{children}</div>;
}

export default function HomeDashboard({
  liveMatches, leagues, receipts,
}: {
  liveMatches: Match[];
  leagues: League[];
  receipts: ProofReceipt[];
}) {
  const receipt = receipts[0] ?? null;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-2xl font-black tracking-tight">
        Make picks. <span className="rounded bg-neon px-1">Prove you know ball.</span>
      </h1>

      <section>
        <Label>⚡ Live now</Label>
        {liveMatches.length > 0 ? (
          <div className="flex flex-col gap-2">
            {liveMatches.map((m) => <MatchListItem key={m.id} match={m} />)}
          </div>
        ) : (
          <Link href="/matches" className="block rounded-2xl border border-[#e2e8f0] bg-white px-4 py-4 text-sm text-slate-500 shadow-card">
            No live matches right now — browse all fixtures ▸
          </Link>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-card">
          <Label>Your leagues</Label>
          {leagues.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {leagues.map((l) => (
                <Link key={l.code} href={`/leagues/${l.code}`} className="flex justify-between text-sm">
                  <span className="font-extrabold">{l.name}</span>
                  <span className="font-bold text-slate-500">#{l.yourRank} of {l.memberCount}</span>
                </Link>
              ))}
            </div>
          ) : (
            <Link href="/leagues" className="text-sm font-bold text-green-600">＋ Create or join a league</Link>
          )}
        </section>

        <section className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-card">
          <Label>Recent proof</Label>
          {receipt ? (
            <Link href={`/r/${receipt.pickId}`} className="inline-block rounded-full bg-green-100 px-2.5 py-1 text-xs font-black text-green-800">
              ✓ O2.5 {receipt.result} +{formatPoints(receipt.points)}
            </Link>
          ) : (
            <p className="text-sm text-slate-500">Make a pick to earn your first verified receipt</p>
          )}
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- HomeDashboard`
Expected: PASS (2 tests).

- [ ] **Step 5: Replace the homepage container**

Replace the entire contents of `app/page.tsx` with:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { Match, League, ProofReceipt } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import HomeDashboard from "@/components/predict/HomeDashboard";

export default function Home() {
  const [data, setData] = useState<{
    liveMatches: Match[]; leagues: League[]; receipts: ProofReceipt[];
  } | null>(null);

  useEffect(() => {
    void Promise.all([
      dataSource.getMatches(),
      dataSource.getMyLeagues(),
      dataSource.getRecentReceipts(1),
    ]).then(([matches, leagues, receipts]) =>
      setData({ liveMatches: matches.filter((m) => m.state === "LIVE"), leagues, receipts }),
    );
  }, []);

  if (!data) return <div className="px-4 py-10 text-center text-slate-400">Loading…</div>;
  return <HomeDashboard {...data} />;
}
```

- [ ] **Step 6: Verify the homepage no longer imports token modules**

Run: `grep -nE "useTokenAddresses|dexscreener|BurnsFeed|StatsStrip|GolazoCard|usePrizePool" app/page.tsx`
Expected: no output.

- [ ] **Step 7: Verify typecheck + tests + build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: PASS. (Build may still compile token routes — that's fine; they're deleted in Phase 4.)

- [ ] **Step 8: Commit**

```bash
git add components/predict/HomeDashboard.tsx components/predict/HomeDashboard.test.tsx app/page.tsx
git commit -m "feat: replace homepage with the prediction hybrid dashboard"
```

---

## Phase 3 — Shell & copy

### Task 13: New navigation, footer, and reframed metadata

**Files:**
- Modify: `components/SiteNav.tsx`
- Modify: `components/SiteFooter.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: nav linking only to `/`, `/matches`, `/leagues`, `/leaderboard`; no token/prize-pool links; reframed metadata/tagline.

- [ ] **Step 1: Rewrite the nav link set and remove token wiring**

Replace the entire contents of `components/SiteNav.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { openIntro } from "@/components/IntroModal";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/matches", label: "Matches" },
  { href: "/leagues", label: "Leagues" },
  { href: "/leaderboard", label: "Leaderboard" },
];

function cx(...c: Array<string | false | null | undefined>): string {
  return c.filter(Boolean).join(" ");
}

function NavLinks({ pathname }: { pathname: string | null }) {
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-slate-100/70 p-1">
      {LINKS.map((link) => {
        const active = isActive(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cx(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
              active ? "bg-white text-green-600 shadow-sm" : "text-slate-500 hover:text-slate-900",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function SiteNav() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/tg")) return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="relative mx-auto max-w-6xl px-4 md:px-8">
        <div className="flex h-14 items-center justify-between gap-3 md:h-16">
          <Link href="/" className="group inline-flex shrink-0 items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-ink text-neon shadow-sm transition-transform group-hover:scale-105">
              <Icon name="football" size={18} strokeWidth={2} />
            </span>
            <span className="text-base font-black tracking-tight text-slate-900 sm:text-lg">Golazo</span>
          </Link>

          <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-16 items-center justify-center md:flex">
            <div className="pointer-events-auto"><NavLinks pathname={pathname} /></div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={openIntro}
              aria-label="How it works"
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <Icon name="help" size={16} />
              <span className="hidden sm:inline">How it works</span>
            </button>
          </div>
        </div>

        <div className="flex justify-center pb-2.5 md:hidden"><NavLinks pathname={pathname} /></div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Update layout metadata + tagline**

In `app/layout.tsx`, replace the `metadata` object's user-facing strings:

```ts
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Golazo: Prove You Know Ball",
    template: "%s · Golazo",
  },
  description:
    "Make picks. Prove you know ball. Verify every result. Free-to-play football prediction leagues with verified results.",
  applicationName: "Golazo",
  openGraph: {
    type: "website",
    siteName: "Golazo",
    title: "Golazo: Prove You Know Ball",
    description: "Make picks. Prove you know ball. Verify every result.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Golazo: Prove You Know Ball",
    description: "Make picks. Prove you know ball. Verify every result.",
  },
};
```

- [ ] **Step 3: Strip token links from the footer**

Open `components/SiteFooter.tsx`. Remove any links/sections pointing to `/prize-pool`, token pages, burns, or buy/trade. Keep brand, social, and remaining nav links (`/matches`, `/leagues`, `/leaderboard`). (Edit in place per the file's actual structure.)

- [ ] **Step 4: Verify nav/footer no longer import token modules**

Run: `grep -nE "usePrizePool|useMatchResults|getTodaysMatches|formatSol|prize-pool" components/SiteNav.tsx components/SiteFooter.tsx`
Expected: no output.

- [ ] **Step 5: Verify typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/SiteNav.tsx components/SiteFooter.tsx app/layout.tsx
git commit -m "feat: reframe nav, footer, and metadata to the prediction product"
```

---

## Phase 4 — Delete the token product

> Each task ends green. Delete only after Phase 2/3 removed the live references. Use `grep` before each deletion to confirm nothing still imports the target.

### Task 14: Delete token routes & pages

**Files (delete):**
- `app/token/` (whole dir), `app/prize-pool/` (whole dir)
- `app/api/burns/`, `app/api/buyback-history/`, `app/api/tokens/`, `app/api/weekly-prize/`, `app/api/stats/`, `app/api/featured/`
- `app/api/admin/snapshot/`
- `app/s/result/`, `app/s/winner/`, `app/s/predictor/` (token/predict share OG routes — confirm none are reused by the new receipt route, which is `app/r/`)

- [ ] **Step 1: Confirm no in-app links point to these routes**

Run: `grep -rnE "/prize-pool|/token/|/api/(burns|tokens|weekly-prize|buyback-history)" app components hooks | grep -v "app/api/"`
Expected: no output (the new nav/home/footer no longer link them).

- [ ] **Step 2: Delete the route directories**

```bash
git rm -r app/token app/prize-pool \
  app/api/burns app/api/buyback-history app/api/tokens app/api/weekly-prize \
  app/api/stats app/api/featured app/api/admin/snapshot \
  app/s/result app/s/winner app/s/predictor
```

- [ ] **Step 3: Typecheck (expect import breakages to surface)**

Run: `npx tsc --noEmit`
Expected: errors only from files that import the now-deleted routes' shared libs — those libs are removed in Task 15. If errors point to `app/admin/page.tsx` or other surviving files, note them for Step 4.

- [ ] **Step 4: Remove dangling references in surviving files**

For each surviving file flagged by Step 3 (e.g. `app/admin/page.tsx` referencing burn/snapshot/weekly-prize panels), remove the relevant imports, JSX sections, and handlers. Re-run `npx tsc --noEmit` until the only remaining errors are missing-module errors for `lib/*`/`hooks/*` slated for Task 15.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete token and prize-pool routes"
```

---

### Task 15: Delete token libs, hooks, components, and constants

**Files (delete):**
- Libs: `lib/burns.ts`, `lib/burns.test.ts`, `lib/buyback.ts`, `lib/burnToken.ts`, `lib/burnToken.test.ts`, `lib/burns.test.ts`, `lib/solanaSupply.ts`, `lib/solanaSupply.test.ts`, `lib/snapshot.ts`, `lib/fees.ts`, `lib/dexscreener.ts`, `lib/price-history.ts`, `lib/weeklyPrize.ts`, `lib/helius.ts`, `lib/golazoBalance.ts`, `lib/golazoPay.ts`, `lib/golazoTransfer.ts`
- Hooks: `hooks/useBurns.ts`, `hooks/useBuybackHistory.ts`, `hooks/useTokenPrice.ts`, `hooks/useTokenAddresses.ts`, `hooks/usePrizePool.ts`, `hooks/useWeeklyPrize.ts`
- Components: `components/BurnsFeed.tsx`, `components/TokenLogo.tsx`, `components/StatsStrip.tsx`, `components/CopyAddress.tsx`, `components/admin/BurnPanel.tsx`
- Constants: `constants/tokens.ts`
- Scripts: `scripts/launch-tokens.ts`, `scripts/snapshot.ts`

**Modify:**
- `constants/teams.ts` — remove token fields from `Team` (`tokenAddress`, `meteoraUrl`, `axiomUrl`, `listed`) and from each row.
- `components/GroupTable.tsx`, `components/MatchBanner.tsx`, `app/admin/page.tsx` — remove token columns/CTAs/sections still referencing the above.

- [ ] **Step 1: Confirm nothing imports each target before deleting**

Run: `grep -rnE "from \"@/(lib/(burns|buyback|burnToken|solanaSupply|snapshot|fees|dexscreener|price-history|weeklyPrize|helius|golazo(Balance|Pay|Transfer))|hooks/(useBurns|useBuybackHistory|useTokenPrice|useTokenAddresses|usePrizePool|useWeeklyPrize)|components/(BurnsFeed|TokenLogo|StatsStrip|CopyAddress)|constants/tokens)" app components hooks lib`
Expected: only matches inside files themselves slated for deletion. Resolve any survivor by editing it first.

- [ ] **Step 2: Edit `constants/teams.ts` to drop token fields**

Remove `listed`, `tokenAddress`, `meteoraUrl`, `axiomUrl` from the `Team` interface and from every row. Keep `ticker`, `name`, `flagCode`, `group`. (The prediction product needs only identity, not market data.)

- [ ] **Step 3: Edit GroupTable / MatchBanner / admin to drop token UI**

Remove price/buy/token columns and CTAs from `components/GroupTable.tsx` and `components/MatchBanner.tsx`; remove burn/token/snapshot/weekly-prize sections from `app/admin/page.tsx`. (Edit in place per actual structure.)

- [ ] **Step 4: Delete the files**

```bash
git rm lib/burns.ts lib/burns.test.ts lib/buyback.ts lib/burnToken.ts lib/burnToken.test.ts \
  lib/solanaSupply.ts lib/solanaSupply.test.ts lib/snapshot.ts lib/fees.ts lib/dexscreener.ts \
  lib/price-history.ts lib/weeklyPrize.ts lib/helius.ts lib/golazoBalance.ts lib/golazoPay.ts lib/golazoTransfer.ts \
  hooks/useBurns.ts hooks/useBuybackHistory.ts hooks/useTokenPrice.ts hooks/useTokenAddresses.ts \
  hooks/usePrizePool.ts hooks/useWeeklyPrize.ts \
  components/BurnsFeed.tsx components/TokenLogo.tsx components/StatsStrip.tsx components/CopyAddress.tsx \
  components/admin/BurnPanel.tsx constants/tokens.ts scripts/launch-tokens.ts scripts/snapshot.ts
```

> If any listed test file does not exist, drop it from the command. Verify the set with `ls` first if unsure.

- [ ] **Step 5: Typecheck, test, build until green**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: PASS. Fix any remaining dangling import by editing the survivor (repeat Step 1's grep to find them).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: delete token libs, hooks, components, and constants"
```

---

### Task 16: Drop Solana/token dependencies & final sweep

**Files:**
- Modify: `package.json`, `.env.example`

- [ ] **Step 1: Confirm no source imports the token deps**

Run: `grep -rnE "@solana/|tweetnacl|@vercel/kv" app components hooks lib constants scripts`
Expected: no output. (If `@vercel/kv` is still used by surviving non-token features — e.g. fantasy/predict/telegram — leave it; only remove deps with zero importers.)

- [ ] **Step 2: Remove unused token dependencies**

In `package.json`, remove the dependencies with zero importers from Step 1 — at minimum: `@solana/spl-token`, `@solana/wallet-adapter-base`, `@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`, `@solana/wallet-adapter-wallets`, `@solana/web3.js`, `tweetnacl`. (Keep `axios`, `flag-icons`, hugeicons, etc.)

- [ ] **Step 3: Reinstall to update the lockfile**

Run: `npm install`
Expected: lockfile updates; no errors.

- [ ] **Step 4: Prune token env vars**

In `.env.example`, remove token/wallet/prize-pool keys: `NEXT_PUBLIC_SOLANA_RPC_URL`, `NEXT_PUBLIC_GOLAZO_TOKEN_ADDRESS`, `NEXT_PUBLIC_PRIZE_POOL_WALLET`, `NEXT_PUBLIC_BUYBACK_WALLET`, `NEXT_PUBLIC_FUTURE_FUND_WALLET`, `HELIUS_API_KEY`. Keep `ADMIN_SECRET`, KV, football/telegram keys still used by surviving features.

- [ ] **Step 5: Final full verification**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: ALL PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: drop Solana/token dependencies and env vars"
```

---

## Self-Review Notes

- **Spec coverage:** §2 visual language → Task 1 + component styling. §3 nav → Task 13. §4.1 home → Task 12. §4.2 pick screen (4 markets, Chaos hero, lock+ghost) → Tasks 3, 7, 8. §4.3 two-layer receipt (inline expand, optional fields gated) → Task 9. §4.4 league+leaderboard (invite hook, toggle, pinned you-row, accuracy+streak) → Task 10. §5 token deletion → Tasks 14–16. §6 reframe copy → Task 13. Matches surface (nav §3) → Task 11.
- **Out of scope (correctly not built here):** real TxLINE/storage wiring (the `dataSource` seam is the swap point), settlement resolver, ghost→account persistence, badges, global leaderboard data, sponsored pools, wallet mode. The `/leaderboard` route is left to a later task; nav links to it but it can keep its current content until the global board lands, or be stubbed.
- **Type consistency:** `Match`, `Market`, `League`, `LeagueMember`, `ProofReceipt`, `PredictDataSource` defined in Task 2 and used verbatim in Tasks 3–12. `buildMarkets` (Task 3) order `[winner, totals, btts, chaos]` is relied on by Task 8's test. Fixtures `FIXTURE_MATCH/LEAGUE/RECEIPT` (Task 5) are reused by every component test.
- **Known follow-ups:** `LocalTime` prop signature must be confirmed in Task 11 (noted inline). `app/leaderboard/page.tsx` replacement is deferred; if its current content imports token modules removed in Phase 4, Task 15 Step 3 must stub it.
