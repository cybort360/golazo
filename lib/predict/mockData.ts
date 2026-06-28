import type {
  Match, League, ProofReceipt, PredictDataSource,
} from "@/lib/predict/types";

const ARG = { ticker: "ARG", name: "Argentina", flagCode: "ar" };
const ESP = { ticker: "ESP", name: "Spain", flagCode: "es" };
const ENG = { ticker: "ENG", name: "England", flagCode: "gb-eng" };
const FRA = { ticker: "FRA", name: "France", flagCode: "fr" };

const HOUR = 3_600_000;

export const FIXTURE_MATCH: Match = {
  id: "GM041", competition: "World Cup", round: "Group J",
  kickoffMs: Date.now() - HOUR, lockMs: Date.now() + 2 * 60_000,
  state: "LIVE", minute: 67, home: ARG, away: ESP, homeScore: 1, awayScore: 1,
};

const MATCHES: Match[] = [
  FIXTURE_MATCH,
  {
    id: "GM042", competition: "World Cup", round: "Group L",
    kickoffMs: Date.now() + 3 * HOUR, lockMs: Date.now() + 3 * HOUR,
    state: "NOT_STARTED", minute: null, home: ENG, away: FRA,
    homeScore: null, awayScore: null,
  },
];

export const FIXTURE_LEAGUE: League = {
  code: "LADS-42", name: "The Lads", yourRank: 2, memberCount: 8,
  members: [
    { rank: 1, userId: "jk", name: "jaykay", initials: "JK", points: 1840, accuracy: 0.71, streak: 5, isYou: false },
    { rank: 2, userId: "yo", name: "you", initials: "YO", points: 1720, accuracy: 0.68, streak: 3, isYou: true },
    { rank: 3, userId: "sm", name: "sammo", initials: "SM", points: 1655, accuracy: 0.64, streak: 1, isYou: false },
    { rank: 4, userId: "dv", name: "davo", initials: "DV", points: 1510, accuracy: 0.59, streak: 0, isYou: false },
  ],
};

export const FIXTURE_RECEIPT: ProofReceipt = {
  pickId: "pk_1", predictionLabel: "Over 2.5 goals", result: "WON",
  home: ARG, away: ESP, homeScore: 2, awayScore: 1, points: 120,
  fixtureId: "wc26_GM041", matchState: "FT", marketLabel: "total_goals · O2.5",
  statKeys: "home_g=2, away_g=1", payloadRef: "evt_8a3f…d91",
  merkleStatus: "root 0x4c…e2", onChainStatus: "confirmed",
  settledAtMs: Date.UTC(2026, 5, 22, 22, 51, 7), txUrl: "https://solscan.io/tx/5Xy…Qk2",
};

const RECEIPTS: ProofReceipt[] = [FIXTURE_RECEIPT];
const LEAGUES: League[] = [FIXTURE_LEAGUE];

export const mockDataSource: PredictDataSource = {
  async getMatches() { return MATCHES; },
  async getMatch(id) { return MATCHES.find((m) => m.id === id) ?? null; },
  async getMyLeagues() { return LEAGUES; },
  async getLeague(code) { return LEAGUES.find((l) => l.code === code) ?? null; },
  async getRecentReceipts(limit = 10) { return RECEIPTS.slice(0, limit); },
  async getReceipt(pickId) { return RECEIPTS.find((r) => r.pickId === pickId) ?? null; },
};
