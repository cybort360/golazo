// Prediction game: pure validation + scoring. Players register a nickname +
// wallet once, predict the 1X2 outcome of upcoming matches (winner-only for
// knockouts), and earn a point per correct call. Points roll up into a season
// board and per-(ISO)week boards for the weekly SOL bounty.
//
// Everything here is pure and dependency-light so scoring is trivially testable;
// KV wiring and the routes live alongside.

import { SCHEDULE } from "@/constants/schedule";
import { gameweekForMatch } from "@/lib/fpl/gameweeks";
import type { MatchResult } from "@/hooks/useMatchResults";

export interface Player {
  // Stable player id: a wallet address (web) or "tg:<telegram-id>" (Telegram).
  id: string;
  nickname: string;
  // Payout / gate wallet. Set for web players; null for Telegram players until
  // they link one (Part 2).
  wallet: string | null;
  createdAt: number;
}

// A pick is the predicted winner's ticker, or the literal "draw".
export const DRAW = "draw";

export interface LeaderRow {
  id: string;
  nickname: string;
  wallet: string | null; // null for Telegram players without a linked wallet
  points: number;
  correct: number;
  played: number; // settled predictions (matches with a result)
}

export interface Leaderboards {
  season: LeaderRow[];
  weeks: Record<string, LeaderRow[]>; // ISO-week key -> rows
}

// ── Validation ────────────────────────────────────────────────────────────────

type Validated = { ok: true; value: string } | { ok: false; error: string };

export function validateNickname(raw: unknown): Validated {
  if (typeof raw !== "string") return { ok: false, error: "Nickname required" };
  const value = raw.trim();
  if (!/^[A-Za-z0-9_]{3,20}$/.test(value)) {
    return {
      ok: false,
      error: "Nickname must be 3–20 letters, numbers, or underscores",
    };
  }
  return { ok: true, value };
}

export function validateWallet(raw: unknown): Validated {
  if (typeof raw !== "string") return { ok: false, error: "Wallet required" };
  const value = raw.trim();
  // base58, Solana address length. Not signature-verified — see the design note.
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
    return { ok: false, error: "Enter a valid Solana wallet address" };
  }
  return { ok: true, value };
}

// ── Scoring ───────────────────────────────────────────────────────────────────

/** A pick scores when it called a draw on a draw, or named the actual winner. */
export function isCorrect(
  pick: string,
  result: { winner: string; loser: string; isDraw: boolean },
): boolean {
  if (pick === DRAW) return result.isDraw;
  return !result.isDraw && pick === result.winner;
}

/**
 * ISO-8601 week key (e.g. "2026-W24") for a YYYY-MM-DD date. Weeks run
 * Monday–Sunday; the week number follows the Thursday rule.
 */
export function weekOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  // Shift to the Thursday of this ISO week.
  const dayMon0 = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - dayMon0 + 3);
  const isoYear = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstThursdayMon0 = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayMon0 + 3);
  const week =
    1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

// Predictions bucket by matchweek (gameweek), shared with fantasy, not ISO
// calendar week — so "This Matchday" lines up with the tournament's rounds.
const WEEK_BY_MATCH = new Map(
  SCHEDULE.map((m) => [m.id, gameweekForMatch(m.id)?.id ?? weekOf(m.date)]),
);

interface Tally {
  points: number;
  correct: number;
  played: number;
}

function emptyTally(): Tally {
  return { points: 0, correct: 0, played: 0 };
}

function sortRows(rows: LeaderRow[]): LeaderRow[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.correct - a.correct ||
      a.nickname.localeCompare(b.nickname),
  );
}

/**
 * Build the season board and per-week boards from registered players, their
 * picks, and the recorded results. Only settled matches (those with a result)
 * count toward `played`/points.
 */
export function buildLeaderboards(
  players: Player[],
  picksById: Record<string, Record<string, string>>,
  results: MatchResult[],
): Leaderboards {
  const resultByMatch = new Map(results.map((r) => [r.matchId, r]));

  const season: LeaderRow[] = [];
  const weekTallies = new Map<string, Map<string, Tally>>(); // week -> playerId -> tally

  for (const player of players) {
    const picks = picksById[player.id] ?? {};
    const seasonTally = emptyTally();

    for (const [matchId, pick] of Object.entries(picks)) {
      const result = resultByMatch.get(matchId);
      if (!result) continue; // not settled yet
      const correct = isCorrect(pick, result);
      seasonTally.played++;
      if (correct) {
        seasonTally.correct++;
        seasonTally.points++;
      }

      const week = WEEK_BY_MATCH.get(matchId);
      if (!week) continue;
      let byId = weekTallies.get(week);
      if (!byId) {
        byId = new Map();
        weekTallies.set(week, byId);
      }
      const wt = byId.get(player.id) ?? emptyTally();
      wt.played++;
      if (correct) {
        wt.correct++;
        wt.points++;
      }
      byId.set(player.id, wt);
    }

    season.push({
      id: player.id,
      nickname: player.nickname,
      wallet: player.wallet,
      points: seasonTally.points,
      correct: seasonTally.correct,
      played: seasonTally.played,
    });
  }

  const playerById = new Map(players.map((p) => [p.id, p]));
  const weeks: Record<string, LeaderRow[]> = {};
  for (const [week, byId] of Array.from(weekTallies.entries())) {
    const rows: LeaderRow[] = [];
    for (const [id, t] of Array.from(byId.entries())) {
      const p = playerById.get(id);
      if (!p) continue;
      rows.push({
        id,
        nickname: p.nickname,
        wallet: p.wallet,
        points: t.points,
        correct: t.correct,
        played: t.played,
      });
    }
    weeks[week] = sortRows(rows);
  }

  return { season: sortRows(season), weeks };
}
