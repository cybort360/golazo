export type MatchState =
  | "NOT_STARTED" | "LIVE" | "HT" | "FT" | "SUSPENDED" | "POSTPONED" | "VOID";

export interface MatchTeam {
  ticker: string;
  name: string;
  flagCode: string;
}

export interface Match {
  id: string;
  competition: string; // "World Cup"
  round: string;       // "Group J"
  kickoffMs: number;
  lockMs: number;      // picks lock at/after this
  state: MatchState;
  minute: number | null;
  home: MatchTeam;
  away: MatchTeam;
  homeScore: number | null;
  awayScore: number | null;
}

export type MarketId = "winner" | "totals" | "btts" | "chaos";

export interface MarketOption {
  id: string;
  label: string;
}

export interface Market {
  id: MarketId;
  title: string;        // "Match winner"
  question: string | null; // chaos: "Goal after the 80th minute?"
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

export interface PredictDataSource {
  getMatches(): Promise<Match[]>;
  getMatch(id: string): Promise<Match | null>;
  getMyLeagues(): Promise<League[]>;
  getLeague(code: string): Promise<League | null>;
  getRecentReceipts(limit?: number): Promise<ProofReceipt[]>;
  getReceipt(pickId: string): Promise<ProofReceipt | null>;
}
