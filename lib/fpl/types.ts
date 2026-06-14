// Shared types for the season-long fantasy game. Kept dependency-free so the
// pure logic (scoring, gameweeks, squad rules, prices) is trivially testable.

export type Position = "GK" | "DEF" | "MID" | "FWD";

export const POSITIONS: Position[] = ["GK", "DEF", "MID", "FWD"];

/** A selectable player in the fantasy pool. */
export interface FplPlayer {
  id: string; // stable id from the stats provider
  name: string;
  team: string; // national-team ticker, e.g. "BRA"
  position: Position;
  price: number; // fixed valuation in budget units (e.g. 9.5)
}

/** Raw per-player events for one match, as scoring consumes them. Any field the
 *  feed doesn't expose is simply absent → that component scores 0. */
export interface PlayerMatchStats {
  playerId: string;
  minutes: number; // 0 if unused
  goals: number;
  assists: number;
  cleanSheet: boolean; // team conceded 0 while the player was on (60+ min)
  goalsConceded: number; // team goals conceded while on the pitch
  yellowCards: number;
  redCards: number;
  ownGoals: number;
}

/** A manager's persisted team. `squad` is the 15; `lineup` is per-gameweek. */
export interface FplTeam {
  playerId: string; // owner (wallet or "tg:<id>"), reusing the predict identity
  name: string; // team name
  squad: string[]; // 15 FplPlayer ids
  createdAt: number;
  // Per-gameweek choices, keyed by gameweek id. Absent → not set yet.
  lineups: Record<string, GameweekLineup>;
  // Transfers made in each gameweek, measured against that gameweek's baseline
  // (to compute the -4 hits). Absent → 0.
  transfersByGw?: Record<string, number>;
  // The squad as it entered each gameweek, snapshotted on the first change of
  // that gameweek so repeated edits are counted from a stable baseline.
  baselineByGw?: Record<string, string[]>;
}

export interface GameweekLineup {
  starters: string[]; // exactly 11 player ids, must be a legal formation
  bench: string[]; // 4 player ids, ordered
  captain: string; // a starter
  viceCaptain: string; // a starter
}

export interface Gameweek {
  id: string; // "GW1" … "GW8"
  label: string; // "Group Matchday 1", "Round of 32", …
  matchIds: string[];
  deadlineMs: number; // first kickoff in the gameweek; team locks at this point
}

// ── Private leagues ─────────────────────────────────────────────────────────

export interface LeagueMember {
  playerId: string;
  wallet: string; // the wallet the entry fee was paid from
  txSig: string; // on-chain proof of the $GOLAZO entry payment
  paidAt: number;
}

export interface League {
  code: string; // short shareable invite code
  name: string;
  creatorId: string;
  entryFee: number; // $GOLAZO per entry
  startGw: string; // gameweek id the league scores from; locks at its deadline
  rakeBps: number; // platform fee in basis points (1000 = 10%)
  status: "open" | "settled" | "void";
  members: LeagueMember[];
  createdAt: number;
  winnerId?: string; // set on settlement
  payoutTxSig?: string; // proof the winner was paid
}
