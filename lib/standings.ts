// Shared derivation of group standings and per-team tournament status from the
// results array. Used by both the homepage (GroupTable status) and the bracket.

import { SCHEDULE } from "@/constants/schedule";
import { TEAMS, type Team } from "@/constants/teams";
import type { MatchResult } from "@/hooks/useMatchResults";

export const GROUP_LETTERS = Array.from(
  new Set(TEAMS.map((t) => t.group)),
).sort();

const SCHEDULE_BY_ID = new Map(SCHEDULE.map((m) => [m.id, m]));

export interface Standing {
  team: Team;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  rank: number;
}

export interface DerivedStandings {
  byGroup: Map<string, Standing[]>;
  groupComplete: Map<string, boolean>;
  groupStarted: Map<string, boolean>;
  best8Thirds: Set<string>;
}

/**
 * FIFA group ordering: points, then goal difference, then goals scored. We
 * stop short of head-to-head and the drawing of lots (which need fixture-level
 * detail we don't model), falling back to wins and then ticker for a stable,
 * deterministic order.
 */
function compareStandings(a: Standing, b: Standing): number {
  return (
    b.points - a.points ||
    b.goalDiff - a.goalDiff ||
    b.goalsFor - a.goalsFor ||
    b.wins - a.wins ||
    a.team.ticker.localeCompare(b.team.ticker)
  );
}

export function computeStandings(results: MatchResult[]): DerivedStandings {
  const recs = new Map<
    string,
    {
      team: Team;
      played: number;
      wins: number;
      draws: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
    }
  >();
  for (const t of TEAMS) {
    recs.set(t.ticker, {
      team: t,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    });
  }

  const groupResultCount = new Map<string, number>();

  for (const r of results) {
    const match = SCHEDULE_BY_ID.get(r.matchId);
    if (!match || !match.groupOrRound.startsWith("Group")) continue;
    const w = recs.get(r.winner);
    const l = recs.get(r.loser);
    if (!w || !l) continue;

    const group = w.team.group;
    groupResultCount.set(group, (groupResultCount.get(group) ?? 0) + 1);

    if (r.isDraw) {
      w.draws++;
      l.draws++;
    } else {
      w.wins++;
      l.losses++;
    }
    w.played++;
    l.played++;

    // Goals feed the goal-difference tiebreaker. Score-less results (older
    // records or manual entries without a score) contribute 0, so they're
    // simply neutral rather than breaking the tally.
    const gw = r.goalsWinner ?? 0;
    const gl = r.goalsLoser ?? 0;
    w.goalsFor += gw;
    w.goalsAgainst += gl;
    l.goalsFor += gl;
    l.goalsAgainst += gw;
  }

  const byGroup = new Map<string, Standing[]>();
  for (const letter of GROUP_LETTERS) {
    const standings: Standing[] = TEAMS.filter((t) => t.group === letter)
      .map((t) => {
        const rec = recs.get(t.ticker);
        const wins = rec?.wins ?? 0;
        const draws = rec?.draws ?? 0;
        const goalsFor = rec?.goalsFor ?? 0;
        const goalsAgainst = rec?.goalsAgainst ?? 0;
        return {
          team: t,
          played: rec?.played ?? 0,
          wins,
          draws,
          losses: rec?.losses ?? 0,
          points: wins * 3 + draws,
          goalsFor,
          goalsAgainst,
          goalDiff: goalsFor - goalsAgainst,
          rank: 0,
        };
      })
      .sort(compareStandings);
    standings.forEach((s, i) => (s.rank = i + 1));
    byGroup.set(letter, standings);
  }

  const groupComplete = new Map<string, boolean>();
  const groupStarted = new Map<string, boolean>();
  for (const letter of GROUP_LETTERS) {
    const count = groupResultCount.get(letter) ?? 0;
    groupComplete.set(letter, count >= 6);
    groupStarted.set(letter, count > 0);
  }

  const thirds = GROUP_LETTERS.map((l) => byGroup.get(l)?.[2]).filter(
    (s): s is Standing => s !== undefined,
  );
  const best8Thirds = new Set(
    [...thirds]
      .sort(compareStandings)
      .slice(0, 8)
      .map((s) => s.team.ticker),
  );

  return { byGroup, groupComplete, groupStarted, best8Thirds };
}

export type TeamStatus = "active" | "eliminated" | "champion";

/**
 * Per-team status for UI coloring:
 * - "champion": the crowned champion.
 * - "eliminated": finished outside the qualifying spots of a completed group,
 *   or lost a knockout match.
 * - "active": still in it (or tournament not yet decided).
 */
export function deriveTeamStatuses(
  results: MatchResult[],
  champion: string | null,
): Map<string, TeamStatus> {
  const status = new Map<string, TeamStatus>(
    TEAMS.map((t): [string, TeamStatus] => [t.ticker, "active"]),
  );

  const { byGroup, groupComplete, best8Thirds } = computeStandings(results);

  // The 8 best third-placed teams advance, but which thirds qualify can only be
  // ranked once every group has finished — comparing thirds across groups while
  // some are mid-play uses incomplete records. So a 3rd-place team is only
  // eliminated after all groups are complete; a 4th-place team can never qualify
  // and is out as soon as its own group finishes.
  const allGroupsComplete = GROUP_LETTERS.every((l) => groupComplete.get(l));

  // Group-stage elimination (only once a group is fully played).
  for (const letter of GROUP_LETTERS) {
    if (!groupComplete.get(letter)) continue;
    for (const s of byGroup.get(letter) ?? []) {
      const thirdEliminated =
        s.rank === 3 && allGroupsComplete && !best8Thirds.has(s.team.ticker);
      if (s.rank === 4 || thirdEliminated) {
        status.set(s.team.ticker, "eliminated");
      }
    }
  }

  // Knockout elimination: the loser of any knockout match is out.
  for (const r of results) {
    const match = SCHEDULE_BY_ID.get(r.matchId);
    if (match && !match.groupOrRound.startsWith("Group")) {
      status.set(r.loser, "eliminated");
    }
  }

  if (champion && status.has(champion)) status.set(champion, "champion");

  return status;
}
