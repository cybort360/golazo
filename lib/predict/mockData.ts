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
    id: "UTDATH", competition: "Premier", round: "Wk 31",
    kickoffMs: Date.now() + 5 * HOUR, lockMs: Date.now() + 5 * HOUR,
    state: "NOT_STARTED", minute: null, phaseLabel: null,
    home: UTD, away: ATH, homeScore: null, awayScore: null,
  },
  {
    id: "RVRWAN", competition: "Premier", round: "Wk 32",
    kickoffMs: Date.now() + 26 * HOUR, lockMs: Date.now() + 26 * HOUR,
    state: "NOT_STARTED", minute: null, phaseLabel: null,
    home: RVR, away: WAN, homeScore: null, awayScore: null,
  },
  {
    id: "ABLCTY", competition: "Premier", round: "Wk 32",
    kickoffMs: Date.now() + 27 * HOUR, lockMs: Date.now() + 27 * HOUR,
    state: "NOT_STARTED", minute: null, phaseLabel: null,
    home: ABL, away: CTY, homeScore: null, awayScore: null,
  },
  {
    id: "WANCNT", competition: "Premier", round: "Wk 30",
    kickoffMs: Date.now() - 26 * HOUR, lockMs: Date.now() - 26 * HOUR,
    state: "FT", minute: 90, phaseLabel: "Full time",
    home: WAN, away: CNT, homeScore: 2, awayScore: 0,
  },
  {
    id: "CTYWAN", competition: "Premier", round: "Wk 30",
    kickoffMs: Date.now() - 27 * HOUR, lockMs: Date.now() - 27 * HOUR,
    state: "FT", minute: 90, phaseLabel: "Full time",
    home: CTY, away: WAN, homeScore: 1, awayScore: 1,
  },
];

export const FIXTURE_LEAGUE: League = {
  code: "GLZ-4F2K", name: "Sunday League", yourRank: 3, memberCount: 12,
  members: [
    { rank: 1, userId: "mk", name: "Mikey", initials: "MK", color: "#f59e0b", points: 1240, accuracy: 0.82, streak: 6, isYou: false },
    { rank: 2, userId: "sr", name: "Sara", initials: "SR", color: "#0ea5e9", points: 1180, accuracy: 0.79, streak: 4, isYou: false },
    { rank: 3, userId: "jk", name: "You (Jordan)", initials: "JK", color: "#1e293b", points: 1095, accuracy: 0.76, streak: 3, isYou: true },
    { rank: 4, userId: "dv", name: "Dav", initials: "DV", color: "#10b981", points: 1010, accuracy: 0.71, streak: 2, isYou: false },
    { rank: 5, userId: "pt", name: "Pat", initials: "PT", color: "#ef4444", points: 940, accuracy: 0.68, streak: 0, isYou: false },
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

const FIXTURE_RECEIPT_2: ProofReceipt = {
  pickId: "7c2b", predictionLabel: "Chaos · Goal after 80'", result: "WON",
  home: WAN, away: CNT, homeScore: 2, awayScore: 0, points: 100,
  fixtureId: "TXL-30-WANCNT", matchState: "FT", marketLabel: "chaos · late_goal",
  statKeys: "late_goal=1", payloadRef: "0x7c2b…a18d",
  merkleStatus: "valid", onChainStatus: "valid",
  settledAtMs: Date.UTC(2026, 5, 27, 16, 10, 0), txUrl: "https://solscan.io/tx/7c2b",
};

const FIXTURE_RECEIPT_3: ProofReceipt = {
  pickId: "d9a2", predictionLabel: "Match winner · United", result: "WON",
  home: CTY, away: UTD, homeScore: 0, awayScore: 2, points: 40,
  fixtureId: "TXL-29-CTYUTD", matchState: "FT", marketLabel: "winner · away",
  statKeys: "home_g=0, away_g=2", payloadRef: "0xd9a2…3f17",
  merkleStatus: "valid", onChainStatus: "valid",
  settledAtMs: Date.UTC(2026, 5, 25, 21, 5, 0), txUrl: "https://solscan.io/tx/d9a2",
};

const FIXTURE_RECEIPT_4: ProofReceipt = {
  pickId: "f4c7", predictionLabel: "Both teams to score · Yes", result: "LOST",
  home: WAN, away: CNT, homeScore: 2, awayScore: 0, points: 0,
  fixtureId: "TXL-30-WANCNT", matchState: "FT", marketLabel: "btts · yes",
  statKeys: "home_g=2, away_g=0", payloadRef: "0xf4c7…9b22",
  merkleStatus: "valid", onChainStatus: "valid",
  settledAtMs: Date.UTC(2026, 5, 27, 16, 10, 0), txUrl: null,
};

const FIXTURE_RECEIPT_5: ProofReceipt = {
  pickId: "a6b8", predictionLabel: "Under 2.5 Goals", result: "WON",
  home: CTY, away: WAN, homeScore: 1, awayScore: 1, points: 30,
  fixtureId: "TXL-30-CTYWAN", matchState: "FT", marketLabel: "total_goals · U2.5",
  statKeys: "home_g=1, away_g=1", payloadRef: "0xa6b8…7e44",
  merkleStatus: "valid", onChainStatus: "valid",
  settledAtMs: Date.UTC(2026, 5, 26, 19, 30, 0), txUrl: "https://solscan.io/tx/a6b8",
};

const RECEIPTS: ProofReceipt[] = [
  FIXTURE_RECEIPT, FIXTURE_RECEIPT_2, FIXTURE_RECEIPT_3, FIXTURE_RECEIPT_4, FIXTURE_RECEIPT_5,
];
const LEAGUES: League[] = [FIXTURE_LEAGUE];

export const mockDataSource: PredictDataSource = {
  async getMatches() { return MATCHES; },
  async getMatch(id) { return MATCHES.find((m) => m.id === id) ?? null; },
  async getMyLeagues() { return LEAGUES; },
  async getLeague(code) { return LEAGUES.find((l) => l.code === code) ?? null; },
  async getRecentReceipts(limit = 10) { return RECEIPTS.slice(0, limit); },
  async getReceipt(pickId) { return RECEIPTS.find((r) => r.pickId === pickId) ?? null; },
};
