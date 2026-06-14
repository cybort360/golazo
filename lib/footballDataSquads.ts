// Builds the fantasy player pool from football-data.org's Deep Data tier
// (GET /v4/competitions/WC/teams returns each team's squad). Maps the provider's
// free-text position to our GK/DEF/MID/FWD bucket and seeds a price. Pure
// mapping is split out (mapPosition) so it's testable without the network.
//
// Requires the €29 "Free + Deep Data" tier — the free tier returns empty squads.

import type { FplPlayer, Position } from "@/lib/fpl/types";
import { priceFor } from "@/lib/fpl/prices";

const BASE_URL = "https://api.football-data.org/v4";
const WORLD_CUP_CODE = "WC";

interface RawSquadPlayer {
  id: number;
  name: string;
  position: string | null;
}
interface RawTeam {
  tla: string | null; // 3-letter code, e.g. "BRA"
  name: string;
  squad?: RawSquadPlayer[];
}
interface RawTeamsResponse {
  teams?: RawTeam[];
}

/**
 * Map football-data's position string to a fantasy bucket. Order matters:
 * "Defensive Midfield" / "Attacking Midfield" are midfielders, and wide players
 * ("winger") count as midfielders the way FPL classes them. Unknown/blank
 * defaults to MID so a player is never dropped from the pool.
 */
export function mapPosition(raw: string | null): Position {
  const p = (raw ?? "").toLowerCase();
  if (/keeper|goalkeeper/.test(p)) return "GK";
  if (/midfield|winger|wing/.test(p)) return "MID";
  if (/back|defence|defender/.test(p)) return "DEF";
  if (/forward|striker|offence|attack/.test(p)) return "FWD";
  return "MID";
}

/** Fetch all squads and build the priced player pool. Throws on auth/HTTP error. */
export async function fetchWorldCupPool(): Promise<FplPlayer[]> {
  const token = process.env.WORLD_CUP_API_TOKEN;
  if (!token) throw new Error("WORLD_CUP_API_TOKEN not configured");

  const res = await fetch(`${BASE_URL}/competitions/${WORLD_CUP_CODE}/teams`, {
    headers: { "X-Auth-Token": token },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`football-data.org responded ${res.status}`);

  const data = (await res.json()) as RawTeamsResponse;
  const teams = Array.isArray(data.teams) ? data.teams : [];

  const pool: FplPlayer[] = [];
  for (const team of teams) {
    const ticker = (team.tla ?? "").toUpperCase();
    if (!ticker) continue; // can't price or group without a code
    for (const sp of team.squad ?? []) {
      if (!sp?.id || !sp.name) continue;
      const position = mapPosition(sp.position);
      pool.push({
        id: String(sp.id),
        name: sp.name,
        team: ticker,
        position,
        price: priceFor(ticker, position),
      });
    }
  }
  return pool;
}
