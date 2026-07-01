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

// An active (not-yet-settled) pick and its match, for the "My Picks" surface.
export interface ActivePick {
  pickId: string;
  marketId: MarketId;
  marketTitle: string; // "Match winner"
  optionLabel: string; // stored predictionLabel, e.g. "Over 2.5"
  createdAtMs: number;
}

export interface ActivePickGroup {
  match: Match;         // reuse the UI Match (built via dbMatchToUi)
  picks: ActivePick[];  // fixed market order: winner, totals, btts, chaos
}

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
  // Who made the pick — lets a shared receipt show + link to its author's
  // profile. isYou drives "Your prediction" vs "<name>'s prediction" copy.
  picker?: {
    handle?: string; // /u/<handle>
    name: string;
    isYou: boolean;
  };
}

export interface LeagueMember {
  rank: number;
  userId: string;
  handle?: string; // url slug for /u/<handle>; absent for mock/empty rows
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

// Sponsored / creator-run free-to-play pool. Prizes are strictly non-cash
// (merch / access / perks) — never real-money wagering — per the compliance
// posture. `creator` marks pools run by a community member vs a brand sponsor.
export type PrizeKind = "merch" | "access" | "perk";

export interface SponsoredPool {
  id: string;
  name: string;
  sponsor: string;
  sponsorColor: string;   // brand chip background (hex)
  prize: string;          // "Signed match shirt + stadium tour"
  prizeKind: PrizeKind;
  description: string;
  entrants: number;
  capacity: number | null;
  closesAtMs: number;
  joined: boolean;
  yourRank: number | null;
  featured: boolean;
  creator: boolean;       // true = creator-run, false = brand-sponsored
}

// Wallet mode (compliance-gated PREVIEW). Optional, opt-in connection for
// wallet-based / on-chain rewards in supported jurisdictions only. This is UI
// scaffolding on the mock seam — no real wallet adapter and no fund movement;
// real activation is gated behind legal/jurisdiction sign-off.
export type WalletRewardStatus = "claimable" | "claimed" | "pending";

export interface WalletReward {
  id: string;
  label: string;       // "Chaos Cup — season Pro access"
  source: string;      // pool / league it came from
  amount: string | null; // "1,000 $GOLAZO" for token rewards, else null
  isToken: boolean;    // on-chain token reward (launches on Meteora)
  status: WalletRewardStatus;
}

export interface WalletState {
  eligibleRegion: boolean; // jurisdiction gate
  connected: boolean;
  address: string | null;  // truncated display address, e.g. "7xKX…9fQ2"
  network: string;         // "Solana"
  rewards: WalletReward[];
}

// Reputation badge derived from prediction history. `progress` drives the
// "x / target" hint shown on locked badges (null when not applicable).
export interface Badge {
  id: string;
  name: string;
  icon: string;        // emoji stand-in
  description: string; // how it is earned
  earned: boolean;
  progress: { current: number; target: number } | null;
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
  badges: Badge[];
}

export interface PredictDataSource {
  getMatches(): Promise<Match[]>;
  getMatch(id: string): Promise<Match | null>;
  getMyLeagues(): Promise<League[]>;
  getLeague(code: string): Promise<League | null>;
  getGlobalLeaderboard(): Promise<GlobalLeaderboard>;
  getProfile(): Promise<ProfileStats>;
  getSponsoredPools(): Promise<SponsoredPool[]>;
  getWalletState(): Promise<WalletState>;
  getRecentReceipts(limit?: number): Promise<ProofReceipt[]>;
  getReceipt(pickId: string): Promise<ProofReceipt | null>;
  getActivePicks(): Promise<ActivePickGroup[]>;
}
