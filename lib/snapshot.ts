// Shared holder-snapshot logic, reused by the admin Champion and Weekly Prize
// sections. Calls the server-side /api/admin/snapshot route (Helius) and
// computes each holder's share of the pot.

export interface Holder {
  address: string;
  uiAmount: number;
}

export interface HolderRow extends Holder {
  share: number; // 0..1 of the total supply held by snapshot wallets
  estSol: number | null; // estimated payout given the pot, null if no pot known
}

// Run the holder snapshot for a token mint and compute each holder's pot share.
// Throws on failure so callers can surface a toast.
export async function runHolderSnapshot(
  mintAddress: string,
  potSol: number | null,
): Promise<HolderRow[]> {
  const res = await fetch("/api/admin/snapshot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mintAddress }),
  });
  const data = (await res.json()) as { ok?: boolean; holders?: Holder[] };
  if (!res.ok || !data.ok || !Array.isArray(data.holders)) {
    throw new Error("Snapshot failed");
  }
  const holders = data.holders;
  const total = holders.reduce((s, h) => s + h.uiAmount, 0);
  return holders.map((h) => {
    const share = total > 0 ? h.uiAmount / total : 0;
    return { ...h, share, estSol: potSol !== null ? share * potSol : null };
  });
}

// Build the holder payout CSV (header row + one row per holder).
export function holderSnapshotCsv(rows: HolderRow[]): string[][] {
  return [
    ["Rank", "Wallet", "Tokens", "Share", "EstSOL"],
    ...rows.map((h, i) => [
      String(i + 1),
      h.address,
      h.uiAmount.toString(),
      `${(h.share * 100).toFixed(4)}%`,
      (h.estSol ?? 0).toFixed(4),
    ]),
  ];
}
