// Builds the fantasy player pool from ESPN: the 48-team list, then each team's
// roster, mapped to our priced FplPlayer. Free, no key, and includes real
// player names + positions. Drop-in replacement for footballDataSquads.

import type { FplPlayer } from "@/lib/fpl/types";
import { priceFor } from "@/lib/fpl/prices";
import { mapPosition } from "@/lib/fpl/positions";
import { espnGet, mapLimited } from "@/lib/espn";

interface RawTeamsResponse {
  sports?: { leagues?: { teams?: { team?: { id?: string; abbreviation?: string } }[] }[] }[];
}
interface RawRosterResponse {
  athletes?: {
    id?: string;
    fullName?: string;
    displayName?: string;
    position?: { name?: string };
  }[];
}

/** Fetch the 48 teams' rosters and build the priced pool. Throws on HTTP error. */
export async function fetchEspnPool(): Promise<FplPlayer[]> {
  const teamsRes = await espnGet<RawTeamsResponse>("/teams");
  const teams = (teamsRes.sports?.[0]?.leagues?.[0]?.teams ?? [])
    .map((t) => t.team)
    .filter((t): t is { id: string; abbreviation: string } => !!t?.id && !!t?.abbreviation);

  const perTeam = await mapLimited(teams, 8, async (team) => {
    const roster = await espnGet<RawRosterResponse>(`/teams/${team.id}/roster`);
    const ticker = team.abbreviation.toUpperCase();
    const players: FplPlayer[] = [];
    for (const a of roster.athletes ?? []) {
      const name = a.fullName ?? a.displayName;
      if (!a.id || !name) continue;
      const position = mapPosition(a.position?.name ?? null);
      players.push({
        id: String(a.id),
        name,
        team: ticker,
        position,
        price: priceFor(ticker, position),
      });
    }
    return players;
  });

  return perTeam.flat();
}
