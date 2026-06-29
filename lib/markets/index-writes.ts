// Best-effort client → server mirrors of settlement + claim into Postgres.
// Fire-and-forget: the devnet program is the source of truth, so the UI never
// blocks on these and tolerates a missing/unmigrated database.

export interface SettlementMirror {
  matchId: string;
  marketId: string;
  winningSide: "YES" | "NO";
  claimedValue: number;
  merkleRoot: string;
  proof: string[];
  settleTx?: string;
  yesTotal?: string;
  noTotal?: string;
  question?: string;
  lockTs?: number; // ms epoch
  match?: { homeTeam?: string; awayTeam?: string; competition?: string; kickoff?: string };
  vaultPda?: string;
  mint?: string;
  voided?: boolean;
}

export interface ReceiptMirror {
  matchId: string;
  marketId: string;
  wallet: string;
  prediction: "YES" | "NO";
  result?: string;
  verified?: boolean;
  escrowAddress?: string;
  settlementTx?: string;
  claimTx?: string;
}

async function post(url: string, body: unknown): Promise<void> {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // ignore — Postgres is an index, not the source of truth
  }
}

export function mirrorSettlement(m: SettlementMirror): Promise<void> {
  return post(`/api/markets/${m.matchId}/${m.marketId}/settle`, m);
}

export function mirrorReceipt(m: ReceiptMirror): Promise<void> {
  return post(`/api/markets/${m.matchId}/${m.marketId}/receipt`, m);
}
