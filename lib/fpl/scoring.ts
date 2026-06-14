// Pure fantasy scoring. Standard FPL-style points, adapted to the World Cup.
// Everything here is total functions over PlayerMatchStats — no IO, no clock —
// so the points table is exhaustively testable and the rest of the game trusts
// it. Missing data degrades to zero rather than throwing.

import type { GameweekLineup, PlayerMatchStats, Position } from "@/lib/fpl/types";

const GOAL_POINTS: Record<Position, number> = { GK: 6, DEF: 6, MID: 5, FWD: 4 };
const CLEAN_SHEET_POINTS: Record<Position, number> = {
  GK: 4,
  DEF: 4,
  MID: 1,
  FWD: 0,
};
const ASSIST_POINTS = 3;
const YELLOW = -1;
const RED = -3;
const OWN_GOAL = -2;

export function zeroStats(playerId: string): PlayerMatchStats {
  return {
    playerId,
    minutes: 0,
    goals: 0,
    assists: 0,
    cleanSheet: false,
    goalsConceded: 0,
    yellowCards: 0,
    redCards: 0,
    ownGoals: 0,
  };
}

/** Combine a player's stat lines across several matches (e.g. a knockout
 *  gameweek). For the common one-match-per-gameweek case this is identity. */
export function combineStats(lines: PlayerMatchStats[]): PlayerMatchStats {
  return lines.reduce((acc, s) => ({
    playerId: s.playerId,
    minutes: acc.minutes + s.minutes,
    goals: acc.goals + s.goals,
    assists: acc.assists + s.assists,
    cleanSheet: acc.cleanSheet || s.cleanSheet,
    goalsConceded: acc.goalsConceded + s.goalsConceded,
    yellowCards: acc.yellowCards + s.yellowCards,
    redCards: acc.redCards + s.redCards,
    ownGoals: acc.ownGoals + s.ownGoals,
  }), zeroStats(lines[0]?.playerId ?? ""));
}

/** Flatten many matches' stat arrays into one stat line per player. */
export function aggregateByPlayer(
  statLists: PlayerMatchStats[][],
): Record<string, PlayerMatchStats> {
  const byPlayer = new Map<string, PlayerMatchStats[]>();
  for (const list of statLists) {
    for (const s of list) {
      const arr = byPlayer.get(s.playerId) ?? [];
      arr.push(s);
      byPlayer.set(s.playerId, arr);
    }
  }
  const out: Record<string, PlayerMatchStats> = {};
  for (const [id, lines] of Array.from(byPlayer.entries())) {
    out[id] = combineStats(lines);
  }
  return out;
}

export interface ScoreBreakdown {
  appearance: number;
  goals: number;
  assists: number;
  cleanSheet: number;
  goalsConceded: number;
  cards: number;
  ownGoals: number;
  total: number;
}

/** Points a single player earned in a match, given their squad position. */
export function scorePlayerBreakdown(
  position: Position,
  s: PlayerMatchStats,
): ScoreBreakdown {
  const appearance = s.minutes <= 0 ? 0 : s.minutes >= 60 ? 2 : 1;
  const goals = s.goals * GOAL_POINTS[position];
  const assists = s.assists * ASSIST_POINTS;
  // Clean sheet only counts for a 60+ minute appearance.
  const cleanSheet =
    s.cleanSheet && s.minutes >= 60 ? CLEAN_SHEET_POINTS[position] : 0;
  // Keepers and defenders lose a point for every 2 goals their team concedes.
  const goalsConceded =
    position === "GK" || position === "DEF"
      ? -Math.floor(s.goalsConceded / 2)
      : 0;
  const cards = s.yellowCards * YELLOW + s.redCards * RED;
  const ownGoals = s.ownGoals * OWN_GOAL;

  const total =
    appearance + goals + assists + cleanSheet + goalsConceded + cards + ownGoals;
  return { appearance, goals, assists, cleanSheet, goalsConceded, cards, ownGoals, total };
}

export function scorePlayer(position: Position, s: PlayerMatchStats): number {
  return scorePlayerBreakdown(position, s).total;
}

export interface LineupScore {
  total: number;
  /** The starter whose points were doubled (captain, or vice if captain DNP). */
  doubledPlayerId: string | null;
  perPlayer: Record<string, number>;
}

/**
 * Score a gameweek lineup. Only the 11 starters score (no auto-subs in v1). The
 * captain's points are doubled; if the captain didn't play a minute, the
 * vice-captain is doubled instead — the standard FPL fallback.
 */
export function scoreLineup(
  lineup: GameweekLineup,
  positionOf: (playerId: string) => Position | undefined,
  statsByPlayer: Record<string, PlayerMatchStats>,
): LineupScore {
  const perPlayer: Record<string, number> = {};
  let total = 0;

  for (const id of lineup.starters) {
    const pos = positionOf(id);
    if (!pos) {
      perPlayer[id] = 0;
      continue;
    }
    const pts = scorePlayer(pos, statsByPlayer[id] ?? zeroStats(id));
    perPlayer[id] = pts;
    total += pts;
  }

  // Captaincy double, with vice fallback when the captain didn't feature.
  const captainPlayed = (statsByPlayer[lineup.captain]?.minutes ?? 0) > 0;
  const doubledPlayerId = captainPlayed ? lineup.captain : lineup.viceCaptain;
  if (doubledPlayerId && lineup.starters.includes(doubledPlayerId)) {
    total += perPlayer[doubledPlayerId] ?? 0;
  }

  return { total, doubledPlayerId: doubledPlayerId ?? null, perPlayer };
}
