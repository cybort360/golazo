"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import MerkleVerifyPanel from "@/components/markets/MerkleVerifyPanel";
import { marketPda, vaultPda } from "@/lib/chain/pdas";
import { CLUSTER } from "@/lib/chain/constants";

// Demo resolved result (mirrors the Mock TxLINE adapter: 2-1 home win).
const DEMO_RESULT: Record<string, 0 | 1> = { home_win: 1, over25: 1, btts: 0 };

const QUESTIONS: Record<string, string> = {
  home_win: "Will the home side win?",
  over25: "Over 2.5 total goals?",
  btts: "Both teams to score?",
};

function explorer(kind: "address" | "tx", id: string) {
  return `https://explorer.solana.com/${kind}/${id}?cluster=${CLUSTER}`;
}

interface TxRow {
  signature: string;
  kind: string;
  walletAddress: string | null;
  createdAt: string;
  metadata?: { matchId?: string; marketId?: string } | null;
}

export default function MarketProofPage({
  params,
}: {
  params: { matchId: string; marketId: string };
}) {
  const { matchId, marketId } = params;
  const market = marketPda(matchId, marketId);
  const vault = vaultPda(market);
  const result = DEMO_RESULT[marketId] ?? 0;

  const [txs, setTxs] = useState<TxRow[]>([]);
  useEffect(() => {
    fetch("/api/markets/tx")
      .then((r) => r.json())
      .then((d) => {
        const rows: TxRow[] = (d.transactions ?? []).filter(
          (t: TxRow) => t.metadata?.matchId === matchId && t.metadata?.marketId === marketId,
        );
        setTxs(rows);
      })
      .catch(() => setTxs([]));
  }, [matchId, marketId]);

  const Addr = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-card">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <a href={explorer("address", value)} target="_blank" rel="noreferrer" className="font-mono text-[12px] text-[#16a34a] hover:underline">
        {value.slice(0, 6)}…{value.slice(-6)} ↗
      </a>
    </div>
  );

  return (
    <div className="mx-auto w-[calc(100%-2rem)] max-w-md pb-12 lg:max-w-lg">
      <div className="mt-5">
        <Link href={`/match/${matchId}`} className="text-[13px] font-bold text-slate-500 hover:text-ink">
          ◂ Back to match
        </Link>
      </div>

      <h1 className="mt-3 text-[24px] font-black tracking-[-0.02em] text-ink">Proof receipt</h1>
      <p className="mt-1 text-[14px] font-semibold text-slate-500">
        {QUESTIONS[marketId] ?? marketId} · resolved{" "}
        <span className="font-black text-ink">{result === 1 ? "YES" : "NO"}</span>
      </p>

      <div className="mt-4 space-y-2">
        <Addr label="Escrow (vault)" value={vault.toBase58()} />
        <Addr label="Market PDA" value={market.toBase58()} />
      </div>

      <div className="mt-4">
        <MerkleVerifyPanel matchId={matchId} marketId={marketId} stats={DEMO_RESULT} />
      </div>

      <div className="mt-4 rounded-2xl border border-[#e2e8f0] bg-white px-5 py-4 shadow-card">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">On-chain transactions</div>
        {txs.length === 0 ? (
          <p className="mt-2 text-[13px] text-slate-500">No indexed transactions yet for this market.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {txs.map((t) => (
              <li key={t.signature} className="flex items-center justify-between py-2">
                <span className="text-[12px] font-bold text-ink">{t.kind}</span>
                <a href={explorer("tx", t.signature)} target="_blank" rel="noreferrer" className="font-mono text-[12px] text-[#16a34a] hover:underline">
                  {t.signature.slice(0, 8)}… ↗
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-center text-[11px] font-semibold text-slate-400">
        Devnet demo only. No real-money wagering or payouts.
      </p>
    </div>
  );
}
