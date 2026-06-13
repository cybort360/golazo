// football-data.org provider client. Speaks only the provider's wire format and
// returns the normalized ExternalMatch shape that lib/resultsSync.ts consumes.
// Knows nothing about our fixtures or KV.
//
// Free tier: register at football-data.org, set WORLD_CUP_API_TOKEN. The whole
// tournament comes back in a single request, so one poll covers every match.

import type { ExternalMatch, LiveStatus } from "@/lib/resultsSync";

const BASE_URL = "https://api.football-data.org/v4";
// FIFA World Cup competition code on football-data.org.
const WORLD_CUP_CODE = "WC";

// Raw shapes (only the fields we use) from GET /competitions/WC/matches.
interface RawTeam {
  name: string | null;
}
interface RawScoreLine {
  home: number | null;
  away: number | null;
}
interface RawMatch {
  stage: string;
  group: string | null;
  utcDate: string;
  status: string;
  homeTeam: RawTeam;
  awayTeam: RawTeam;
  score: {
    winner: string | null; // "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null
    fullTime: RawScoreLine;
  };
}
interface RawMatchesResponse {
  matches?: RawMatch[];
}

function normalizeStatus(status: string): LiveStatus {
  switch (status) {
    case "SCHEDULED":
    case "TIMED":
      return "scheduled";
    case "IN_PLAY":
      return "live";
    case "PAUSED":
      return "paused";
    case "FINISHED":
      return "finished";
    default:
      // POSTPONED / SUSPENDED / CANCELLED / AWARDED — not something we surface.
      return "other";
  }
}

function normalizeWinner(
  winner: string | null,
): ExternalMatch["winner"] {
  switch (winner) {
    case "HOME_TEAM":
      return "home";
    case "AWAY_TEAM":
      return "away";
    case "DRAW":
      return "draw";
    default:
      return null;
  }
}

/** Convert one raw match to our normalized shape, or null if teams are missing. */
function normalizeMatch(raw: RawMatch): ExternalMatch | null {
  const homeName = raw.homeTeam?.name;
  const awayName = raw.awayTeam?.name;
  // Knockout fixtures show null teams until the bracket fills — nothing to map.
  if (!homeName || !awayName) return null;
  return {
    stage: raw.stage,
    group: raw.group ?? null,
    utcDate: raw.utcDate,
    homeName,
    awayName,
    status: normalizeStatus(raw.status),
    homeScore: raw.score?.fullTime?.home ?? null,
    awayScore: raw.score?.fullTime?.away ?? null,
    winner: normalizeWinner(raw.score?.winner ?? null),
  };
}

/**
 * Fetch every World Cup match and return them normalized. Throws on a missing
 * token or a non-OK response so the caller can fall back to the last snapshot.
 */
export async function fetchWorldCupMatches(): Promise<ExternalMatch[]> {
  const token = process.env.WORLD_CUP_API_TOKEN;
  if (!token) throw new Error("WORLD_CUP_API_TOKEN not configured");

  const res = await fetch(`${BASE_URL}/competitions/${WORLD_CUP_CODE}/matches`, {
    headers: { "X-Auth-Token": token },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`football-data.org responded ${res.status}`);
  }

  const data = (await res.json()) as RawMatchesResponse;
  const raw = Array.isArray(data.matches) ? data.matches : [];
  return raw
    .map(normalizeMatch)
    .filter((m): m is ExternalMatch => m !== null);
}
