import type {
  Match, MatchTeam, League, ProofReceipt, PredictDataSource,
} from "@/lib/predict/types";

// Sample clubs (mock). `ticker` is the 3-letter code shown in the avatar circle,
// `color` is that circle's background.
const ABL: MatchTeam = { ticker: "ABL", name: "Albion", flagCode: "gb-eng", color: "#dc2626" };
const RVR: MatchTeam = { ticker: "RVR", name: "Rovers", flagCode: "gb-eng", color: "#2563eb" };
const CTY: MatchTeam = { ticker: "CTY", name: "City", flagCode: "gb-eng", color: "#0f766e" };
const UTD: MatchTeam = { ticker: "UTD", name: "United", flagCode: "gb-eng", color: "#7c3aed" };
const CNT: MatchTeam = { ticker: "CNT", name: "County", flagCode: "gb-eng", color: "#16a34a" };
const ATH: MatchTeam = { ticker: "ATH", name: "Athletic", flagCode: "gb-eng", color: "#7f1d1d" };
const WAN: MatchTeam = { ticker: "WAN", name: "Wanderers", flagCode: "gb-eng", color: "#ea580c" };

const HOUR = 3_600_000;

export const FIXTURE_MATCH: Match = {
  id: "ABLRVR", competition: "Premier", round: "Wk 31",
  kickoffMs: Date.now() - HOUR, lockMs: Date.now() + 4 * 60_000 + 32_000,
  state: "LIVE", minute: 67, phaseLabel: "2nd half",
  home: ABL, away: RVR, homeScore: 1, awayScore: 1,
};

const MATCHES: Match[] = [
  FIXTURE_MATCH,
  {
    id: "CTYUTD", competition: "Premier", round: "Wk 31",
    kickoffMs: Date.now() - 50 * 60_000, lockMs: Date.now() - 50 * 60_000,
    state: "HT", minute: 45, phaseLabel: "Half time",
    home: CTY, away: UTD, homeScore: 0, awayScore: 0,
  },
  {
    id: "CNTATH", competition: "Premier", round: "Wk 31",
    kickoffMs: Date.now() + 3 * HOUR, lockMs: Date.now() + 3 * HOUR,
    state: "NOT_STARTED", minute: null, phaseLabel: null,
    home: CNT, away: ATH, homeScore: null, awayScore: null,
  },
  {
    id: "WANCNT", competition: "Premier", round: "Wk 30",
    kickoffMs: Date.now() - 26 * HOUR, lockMs: Date.now() - 26 * HOUR,
    state: "FT", minute: 90, phaseLabel: "Full time",
    home: WAN, away: CNT, homeScore: 2, awayScore: 0,
  },
];

export const FIXTURE_LEAGUE: League = {
  code: "GLZ-4F2K", name: "Sunday League", yourRank: 3, memberCount: 12,
  members: [
    { rank: 1, userId: "mk", name: "Mikey", initials: "MK", points: 1240, accuracy: 0.82, streak: 6, isYou: false },
    { rank: 2, userId: "sr", name: "Sara", initials: "SR", points: 1180, accuracy: 0.79, streak: 4, isYou: false },
    { rank: 3, userId: "jk", name: "You (Jordan)", initials: "JK", points: 1095, accuracy: 0.76, streak: 3, isYou: true },
    { rank: 4, userId: "dv", name: "Dav", initials: "DV", points: 1010, accuracy: 0.71, streak: 2, isYou: false },
    { rank: 5, userId: "pt", name: "Pat", initials: "PT", points: 940, accuracy: 0.68, streak: 0, isYou: false },
  ],
};

export const FIXTURE_RECEIPT: ProofReceipt = {
  pickId: "9f3a", predictionLabel: "Over 2.5 Goals", result: "WON",
  home: ABL, away: RVR, homeScore: 3, awayScore: 1, points: 50,
  fixtureId: "TXL-31-ABLRVR", matchState: "FT", marketLabel: "total_goals · O2.5",
  statKeys: "home_g=3, away_g=1", payloadRef: "0x9f3a…c41e",
  merkleStatus: "valid", onChainStatus: "valid",
  settledAtMs: Date.UTC(2026, 5, 28, 17, 42, 0), txUrl: "https://solscan.io/tx/9f3a",
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
