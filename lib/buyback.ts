// Public buyback history feed. Each entry records a token burn the team ran
// from its wallet after a winning match.

export interface BuybackEntry {
  matchId: string;
  matchLabel: string; // e.g. "BRA vs MAR"
  teamId: string; // winning team ticker
  teamName: string;
  tokensBurned: string; // free-form, as entered by the admin
  txUrl: string; // Solscan transaction URL
  timestamp: number; // ms epoch the buyback was logged
}
