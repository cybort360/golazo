import type { TxlineGoal, TxlineMatchState, TxlineTeam } from "@/lib/txline/client";

// Scripted World Cup 2026 data for the mock TxLINE client. Deterministic timelines
// (fixed goal minutes) so demos, settlement and proofs are reproducible. National
// teams keep the hackathon on-theme; the structure is multi-competition so we add
// leagues after.

export const COMPETITION = "World Cup 2026";

const T = (id: string, name: string, ticker: string, flagCode: string, color: string): TxlineTeam => ({
  id, name, ticker, flagCode, color,
});

export const TEAMS = {
  BRA: T("BRA", "Brazil", "BRA", "br", "#FCD116"),
  ARG: T("ARG", "Argentina", "ARG", "ar", "#75AADB"),
  FRA: T("FRA", "France", "FRA", "fr", "#1E3A8A"),
  ESP: T("ESP", "Spain", "ESP", "es", "#C60B1E"),
  ENG: T("ENG", "England", "ENG", "gb-eng", "#cf142b"),
  GER: T("GER", "Germany", "GER", "de", "#111111"),
  POR: T("POR", "Portugal", "POR", "pt", "#006600"),
  NED: T("NED", "Netherlands", "NED", "nl", "#EA580C"),
} as const;

export type Phase = "finished" | "live" | "halftime" | "upcoming";

export interface ScriptedFixture {
  id: string;
  round: string;
  home: TxlineTeam;
  away: TxlineTeam;
  phase: Phase;
  kickoffOffsetMs: number; // relative to now; negative = in the past
  lockOffsetMs: number; // relative to now; picks lock at/after this
  goals: TxlineGoal[]; // full-match goal log (visible portion derived from liveMinute)
  liveMinute?: number; // current minute for live/halftime fixtures
  finalState?: TxlineMatchState; // FT (default for finished) or VOID
  stats?: Record<string, number>; // extra reported stats (e.g. corners)
  unavailable?: string[]; // stat keys flagged unreliable → MARKET VOID
}

const MIN = 60_000;
const HOUR = 3_600_000;

// Eight fixtures spanning every state the loop must handle. Goal minutes are
// chosen to exercise the resolvers: late goals (>80') for Chaos, clean sheets for
// BTTS, boundary totals, and a VOID + a stat-unavailable case.
export const FIXTURES: ScriptedFixture[] = [
  // — Finished (settle-eligible) —
  {
    id: "WC-A-BRA-ARG",
    round: "Group A",
    home: TEAMS.BRA,
    away: TEAMS.ARG,
    phase: "finished",
    kickoffOffsetMs: -3 * HOUR,
    lockOffsetMs: -3 * HOUR,
    goals: [
      { minute: 23, team: "home" },
      { minute: 58, team: "away" },
      { minute: 87, team: "home" }, // late winner → Chaos YES
    ],
  },
  {
    id: "WC-A-FRA-ESP",
    round: "Group A",
    home: TEAMS.FRA,
    away: TEAMS.ESP,
    phase: "finished",
    kickoffOffsetMs: -4 * HOUR,
    lockOffsetMs: -4 * HOUR,
    goals: [
      { minute: 35, team: "home" },
      { minute: 70, team: "away" }, // no late goal → Chaos NO; 1-1 → Under, BTTS YES
    ],
  },
  {
    id: "WC-D-GER-NED",
    round: "Group D",
    home: TEAMS.GER,
    away: TEAMS.NED,
    phase: "finished",
    kickoffOffsetMs: -26 * HOUR,
    lockOffsetMs: -26 * HOUR,
    goals: [
      { minute: 12, team: "home" },
      { minute: 55, team: "home" },
      { minute: 90, team: "home" }, // 3-0 → Over, BTTS NO, Chaos YES (90')
    ],
    stats: { corners: 7 },
  },
  {
    id: "WC-D-ESP-GER",
    round: "Group D",
    home: TEAMS.ESP,
    away: TEAMS.GER,
    phase: "finished",
    kickoffOffsetMs: -28 * HOUR,
    lockOffsetMs: -28 * HOUR,
    goals: [
      { minute: 41, team: "home" },
      { minute: 63, team: "away" },
    ],
    unavailable: ["corners"], // corner stat unreliable → corner market would VOID
  },
  // — Abandoned / VOID —
  {
    id: "WC-C-POR-NED",
    round: "Group C",
    home: TEAMS.POR,
    away: TEAMS.NED,
    phase: "finished",
    kickoffOffsetMs: -2 * HOUR,
    lockOffsetMs: -2 * HOUR,
    finalState: "VOID", // abandoned, no official final → all markets VOID
    goals: [{ minute: 30, team: "home" }],
  },
  // — In progress —
  {
    id: "WC-B-ENG-GER",
    round: "Group B",
    home: TEAMS.ENG,
    away: TEAMS.GER,
    phase: "live",
    kickoffOffsetMs: -67 * MIN,
    lockOffsetMs: -67 * MIN,
    liveMinute: 67,
    goals: [
      { minute: 40, team: "home" }, // currently 1-0
      { minute: 83, team: "away" }, // scripted to occur later (minute > liveMinute → not yet visible)
    ],
  },
  {
    id: "WC-B-FRA-POR",
    round: "Group B",
    home: TEAMS.FRA,
    away: TEAMS.POR,
    phase: "halftime",
    kickoffOffsetMs: -50 * MIN,
    lockOffsetMs: -50 * MIN,
    liveMinute: 45,
    goals: [], // 0-0 at the break
  },
  // — Upcoming (open for picks) —
  {
    id: "WC-C-BRA-FRA",
    round: "Group C",
    home: TEAMS.BRA,
    away: TEAMS.FRA,
    phase: "upcoming",
    kickoffOffsetMs: 3 * HOUR,
    lockOffsetMs: 3 * HOUR - 5 * MIN,
    goals: [],
  },
  {
    id: "WC-C-ARG-ENG",
    round: "Group C",
    home: TEAMS.ARG,
    away: TEAMS.ENG,
    phase: "upcoming",
    kickoffOffsetMs: 5 * HOUR,
    lockOffsetMs: 5 * HOUR - 5 * MIN,
    goals: [],
  },
];

export function findFixture(id: string): ScriptedFixture | undefined {
  return FIXTURES.find((f) => f.id === id);
}
