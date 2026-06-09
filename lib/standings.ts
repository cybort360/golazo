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
  rank: number;
}

export interface DerivedStandings {
  byGroup: Map<string, Standing[]>;
  groupComplete: Map<string, boolean>;
  groupStarted: Map<string, boolean>;
  best8Thirds: Set<string>;
}

export function computeStandings(results: MatchResult[]): DerivedStandings {
  const recs = new Map<
    string,
    { team: Team; played: number; wins: number; draws: number; losses: number }
  >();
  for (const t of TEAMS) {
    recs.set(t.ticker, { team: t, played: 0, wins: 0, draws: 0, losses: 0 });
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
  }

  const byGroup = new Map<string, Standing[]>();
  for (const letter of GROUP_LETTERS) {
    const standings: Standing[] = TEAMS.filter((t) => t.group === letter)
      .map((t) => {
        const rec = recs.get(t.ticker);
        const wins = rec?.wins ?? 0;
        const draws = rec?.draws ?? 0;
        return {
          team: t,
          played: rec?.played ?? 0,
          wins,
          draws,
          losses: rec?.losses ?? 0,
          points: wins * 3 + draws,
          rank: 0,
        };
      })
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.wins - a.wins ||
          a.team.ticker.localeCompare(b.team.ticker),
      );
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
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.wins - a.wins ||
          a.team.ticker.localeCompare(b.team.ticker),
      )
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

  // Group-stage elimination (only once a group is fully played).
  for (const letter of GROUP_LETTERS) {
    if (!groupComplete.get(letter)) continue;
    for (const s of byGroup.get(letter) ?? []) {
      if (s.rank === 4 || (s.rank === 3 && !best8Thirds.has(s.team.ticker))) {
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
