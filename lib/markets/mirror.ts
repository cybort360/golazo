// Best-effort client → server mirror of an on-chain transaction into Postgres.
// Fire-and-forget: the chain is the source of truth, so UI never blocks on this
// and silently tolerates a missing/unmigrated database.

export interface MirrorTxInput {
  signature: string;
  wallet: string;
  matchId: string;
  marketId: string;
  kind: string;
}

const KIND_MAP: Record<string, string> = {
  faucet: "FAUCET",
  init_market: "INIT_MARKET",
  stake: "STAKE",
  settle: "SETTLE",
  claim: "CLAIM",
  refund: "REFUND",
};

export async function mirrorTx(input: MirrorTxInput): Promise<void> {
  try {
    await fetch("/api/markets/tx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, kind: KIND_MAP[input.kind] ?? "STAKE" }),
      keepalive: true,
    });
  } catch {
    // ignore — Postgres is an index, not the source of truth
  }
}
