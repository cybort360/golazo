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
  // Transfers already made in each gameweek (to compute hits). Absent → 0.
  transfersByGw?: Record<string, number>;
  // Free transfers were used setting up the initial squad? No — initial pick is free.
  freeTransfersUsed?: Record<string, boolean>;
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
