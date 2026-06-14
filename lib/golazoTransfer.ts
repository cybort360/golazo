// Verifies a $GOLAZO entry-fee payment on-chain: confirms a transaction really
// moved at least `minAmount` of the $GOLAZO mint from `from` into the treasury.
// Uses pre/post token balances so it works for both `transfer` and
// `transferChecked`. Server-only (RPC). Never throws — returns a reason on
// failure so the join route can surface it.

import { golazoMint } from "@/lib/golazoBalance";

interface TokenBalance {
  owner?: string;
  mint?: string;
  uiTokenAmount?: { uiAmount?: number | null };
}
interface TxResponse {
  result?: {
    meta?: {
      err?: unknown;
      preTokenBalances?: TokenBalance[];
      postTokenBalances?: TokenBalance[];
    } | null;
  } | null;
}

export interface PaymentCheck {
  ok: boolean;
  amount?: number;
  error?: string;
}

function ownerMintTotal(
  balances: TokenBalance[] | undefined,
  owner: string,
  mint: string,
): number {
  let total = 0;
  for (const b of balances ?? []) {
    if (b.owner === owner && b.mint === mint) {
      total += b.uiTokenAmount?.uiAmount ?? 0;
    }
  }
  return total;
}

export async function verifyGolazoPayment(params: {
  signature: string;
  from: string;
  treasury: string;
  minAmount: number;
}): Promise<PaymentCheck> {
  const { signature, from, treasury, minAmount } = params;
  const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (!rpc) return { ok: false, error: "RPC not configured" };
  const mint = await golazoMint();
  if (!mint) return { ok: false, error: "$GOLAZO mint not configured" };

  let data: TxResponse;
  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
      }),
    });
    if (!res.ok) return { ok: false, error: "Could not reach the network" };
    data = (await res.json()) as TxResponse;
  } catch {
    return { ok: false, error: "Could not reach the network" };
  }

  const meta = data.result?.meta;
  if (!data.result || !meta) return { ok: false, error: "Transaction not found yet — try again in a moment" };
  if (meta.err) return { ok: false, error: "That transaction failed on-chain" };

  // Treasury must have received at least the entry fee in $GOLAZO.
  const received =
    ownerMintTotal(meta.postTokenBalances, treasury, mint) -
    ownerMintTotal(meta.preTokenBalances, treasury, mint);
  if (received + 1e-9 < minAmount) {
    return { ok: false, error: "Payment didn't reach the treasury for the full entry fee" };
  }

  // The payer's $GOLAZO must have decreased — proves they funded it.
  const senderDelta =
    ownerMintTotal(meta.postTokenBalances, from, mint) -
    ownerMintTotal(meta.preTokenBalances, from, mint);
  if (senderDelta >= 0) {
    return { ok: false, error: "That payment didn't come from your wallet" };
  }

  return { ok: true, amount: received };
}
