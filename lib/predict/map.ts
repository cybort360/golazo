import type { Match, MatchState } from "@/lib/predict/types";

// Pure mapping from a DB Match row (or its JSON form) to the UI `Match` type the
// screens already consume — so wiring real data needs no UI changes.

export interface DbMatchRow {
  id: string;
  competition: string | null;
  round: string | null;
  homeTeam: string;
  awayTeam: string;
  homeTicker: string | null;
  awayTicker: string | null;
  homeFlag: string | null;
  awayFlag: string | null;
  homeColor: string | null;
  awayColor: string | null;
  kickoff: string | number | Date;
  lockAt: string | number | Date | null;
  status: string;
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
}

function ms(v: string | number | Date | null | undefined, fallback: number): number {
  if (v == null) return fallback;
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? fallback : t;
}

const STATES: MatchState[] = ["NOT_STARTED", "LIVE", "HT", "FT", "SUSPENDED", "POSTPONED", "VOID"];
function asState(s: string): MatchState {
  return (STATES as string[]).includes(s) ? (s as MatchState) : "NOT_STARTED";
}

function phaseLabel(state: MatchState, minute: number | null): string | null {
  switch (state) {
    case "LIVE":
      return (minute ?? 0) > 45 ? "2nd half" : "1st half";
    case "HT":
      return "Half time";
    case "FT":
      return "Full time";
    case "VOID":
      return "Abandoned";
    default:
      return null;
  }
}

export function dbMatchToUi(row: DbMatchRow): Match {
  const kickoffMs = ms(row.kickoff, Date.now());
  const state = asState(row.status);
  return {
    id: row.id,
    competition: row.competition ?? "",
    round: row.round ?? "",
    kickoffMs,
    lockMs: ms(row.lockAt, kickoffMs),
    state,
    minute: row.minute,
    phaseLabel: phaseLabel(state, row.minute),
    home: {
      ticker: row.homeTicker ?? row.homeTeam.slice(0, 3).toUpperCase(),
      name: row.homeTeam,
      flagCode: row.homeFlag ?? "",
      color: row.homeColor ?? "#334155",
    },
    away: {
      ticker: row.awayTicker ?? row.awayTeam.slice(0, 3).toUpperCase(),
      name: row.awayTeam,
      flagCode: row.awayFlag ?? "",
      color: row.awayColor ?? "#334155",
    },
    homeScore: row.homeScore,
    awayScore: row.awayScore,
  };
}
