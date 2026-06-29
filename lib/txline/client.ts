// TxLINE = the live-football-data + result-verification layer the whole product
// is built on. This file is the SINGLE integration seam: today a MockTxlineClient
// serves scripted World Cup fixtures; when real API access lands, implement
// RealTxlineClient against this same interface and flip TXLINE_MODE=live —
// nothing downstream (ingestion, state machine, resolver, receipts) changes.
//
// Multi-competition by design: World Cup first (hackathon), expand after.

export type TxlineMatchState =
  | "NOT_STARTED"
  | "LIVE"
  | "HT"
  | "FT"
  | "SUSPENDED"
  | "POSTPONED"
  | "VOID";

export interface TxlineTeam {
  id: string; // stable team id, e.g. "BRA"
  name: string; // "Brazil"
  ticker: string; // 3-letter code, "BRA"
  flagCode: string; // flag asset code, "br"
  color: string; // avatar background (hex)
}

export interface TxlineFixture {
  id: string; // stable fixture id, e.g. "WC-A-BRA-ARG"
  competition: string; // "World Cup 2026"
  round: string; // "Group A" | "Round of 16" | ...
  kickoffMs: number;
  lockMs: number; // picks lock at/after this
  home: TxlineTeam;
  away: TxlineTeam;
}

export type TxlineEventType =
  | "kickoff"
  | "goal"
  | "ht"
  | "second_half"
  | "ft"
  | "state"
  | "void";

// An append-only live update (PRD §10.3 — keep the full trail, not just latest).
export interface TxlineLiveEvent {
  fixtureId: string;
  seq: number; // monotonic per fixture; ordering key for the append-only log
  tsMs: number; // wall-clock of the event
  minute: number | null; // match minute at the event
  type: TxlineEventType;
  state: TxlineMatchState;
  homeScore: number;
  awayScore: number;
  team?: "home" | "away"; // set when type === "goal"
  payload?: Record<string, unknown>; // raw provider payload echo/reference
}

export interface TxlineStateSnapshot {
  fixtureId: string;
  state: TxlineMatchState;
  minute: number | null;
  phaseLabel: string | null;
  homeScore: number | null;
  awayScore: number | null;
  updatedMs: number;
}

export interface TxlineGoal {
  minute: number;
  team: "home" | "away";
}

// Verified final result + the proof metadata the Advanced receipt (PRD §8.2)
// needs. `stats`/`available` drive market resolution + per-market VOID.
export interface TxlineFinalResult {
  fixtureId: string;
  state: TxlineMatchState; // FT | VOID | ...
  homeScore: number;
  awayScore: number;
  goals: TxlineGoal[]; // goal timestamps → chaos resolver
  stats: Record<string, number>; // e.g. { home_goals, away_goals, corners }
  available: Record<string, boolean>; // reliable stat keys (false → market VOID)
  // verification fields
  payloadRef: string; // raw payload reference id
  merkleRoot: string | null; // present when TxLINE supplies a proof
  settledAtMs: number;
}

/**
 * The TxLINE integration surface. Keep this minimal and provider-agnostic so the
 * real client is a drop-in. Reads only — settlement/escrow live on-chain + in our
 * own DB.
 */
export interface TxlineClient {
  mode: "mock" | "live";
  competitions(): Promise<string[]>;
  fixtures(opts?: { competition?: string }): Promise<TxlineFixture[]>;
  fixture(id: string): Promise<TxlineFixture | null>;
  state(fixtureId: string): Promise<TxlineStateSnapshot | null>;
  /** Append-only live events for a fixture, optionally only those after `sinceSeq`. */
  liveEvents(fixtureId: string, sinceSeq?: number): Promise<TxlineLiveEvent[]>;
  /** Verified final result + proof metadata; null until the fixture is final. */
  finalResult(fixtureId: string): Promise<TxlineFinalResult | null>;
}
