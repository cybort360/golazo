export type MatchState =
  | "NOT_STARTED" | "LIVE" | "HT" | "FT" | "SUSPENDED" | "POSTPONED" | "VOID";

export interface MatchTeam {
  ticker: string;      // short code shown in the avatar circle, e.g. "ABL"
  name: string;
  flagCode: string;
  color: string;       // avatar circle background (hex)
}

export interface Match {
  id: string;
  competition: string; // "Premier"
  round: string;       // "Wk 31"
  kickoffMs: number;
  lockMs: number;      // picks lock at/after this
  state: MatchState;
  minute: number | null;
  phaseLabel: string | null; // "2nd half", "Half time", etc.
  home: MatchTeam;
  away: MatchTeam;
  homeScore: number | null;
  awayScore: number | null;
}

export type MarketId = "winner" | "totals" | "btts" | "chaos";

export interface MarketOption {
  id: string;
  label: string;
  odds: string | null; // e.g. "2.10"; null when not shown
}

export interface Market {
  id: MarketId;
  title: string;        // "Match winner"
  question: string | null; // chaos: "Goal after the 80th minute?"
  subtitle: string | null; // chaos: "High risk, high reward. The Golazo special."
  rewardBadge: string | null; // chaos: "2× POINTS"
  options: MarketOption[];
  hero: boolean;        // chaos = true
}

export type PickResult = "PENDING" | "WON" | "LOST" | "VOID";

export interface ProofReceipt {
  pickId: string;
  predictionLabel: string; // "Over 2.5 goals"
  result: PickResult;
  home: MatchTeam;
  away: MatchTeam;
  homeScore: number;
  awayScore: number;
  points: number;
  // advanced proof
  fixtureId: string;
  matchState: MatchState;
  marketLabel: string;     // "total_goals · O2.5"
  statKeys: string;        // "home_g=2, away_g=1"
  payloadRef: string;      // "evt_8a3f…d91"
  merkleStatus: string | null;
  onChainStatus: string | null;
  settledAtMs: number;
  txUrl: string | null;
}

export interface LeagueMember {
  rank: number;
  userId: string;
  name: string;
  initials: string;
  color: string; // avatar circle background (hex)
  points: number;
  accuracy: number; // 0..1
  streak: number;
  isYou: boolean;
}

export interface League {
  code: string;
  name: string;
  yourRank: number;
  memberCount: number;
  members: LeagueMember[]; // sorted by rank asc
}

// Public, all-users ranking. Secondary to private leagues: shows the top of the
// table plus the current player's own standing (which may sit outside the top).
export interface GlobalLeaderboard {
  totalPlayers: number;
  you: LeagueMember;     // your standing, may be outside `top`
  top: LeagueMember[];   // leading players, sorted by rank asc
}

// Public, shareable player profile derived from prediction history.
export interface ProfileStats {
  handle: string;
  displayName: string;
  initials: string;
  color: string;
  tagline: string;
  globalRank: number | null;
  accuracy: number;        // 0..1
  currentStreak: number;
  totalPicks: number;
  wins: number;
  points: number;
  favoriteMarket: string;  // "Total goals"
  biggestUpset: {
    label: string;         // "Chaos · Goal after 80'"
    detail: string;        // "WAN 2–0 CNT"
    points: number;
  } | null;
}

export interface PredictDataSource {
  getMatches(): Promise<Match[]>;
  getMatch(id: string): Promise<Match | null>;
  getMyLeagues(): Promise<League[]>;
  getLeague(code: string): Promise<League | null>;
  getGlobalLeaderboard(): Promise<GlobalLeaderboard>;
  getProfile(): Promise<ProfileStats>;
  getRecentReceipts(limit?: number): Promise<ProofReceipt[]>;
  getReceipt(pickId: string): Promise<ProofReceipt | null>;
}
