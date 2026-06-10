// Weekly Prize mechanic: each week the admin pins a single match and a SOL pot.
// After the match, holders of the winning team's token split the pot. A draw
// rolls the pot into the next week.

export type WeeklyPrizeStatus = "upcoming" | "snapshot_ready" | "paid";

export interface WeeklyPrize {
  matchId: string;
  potSol: number;
  status: WeeklyPrizeStatus;
  winnerTeamId: string | null; // ticker of the winning team, once decided
  txHash: string | null; // payout transaction, once paid
  week: number;
}

export interface WeeklyPrizeApiResponse {
  current: WeeklyPrize | null;
  history: WeeklyPrize[];
}
