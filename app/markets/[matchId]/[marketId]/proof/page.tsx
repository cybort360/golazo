"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import MerkleVerifyPanel from "@/components/markets/MerkleVerifyPanel";
import { marketPda, vaultPda } from "@/lib/chain/pdas";
import { CLUSTER } from "@/lib/chain/constants";
import { Check } from "@phosphor-icons/react/dist/ssr";

// Demo resolved result (mirrors the Mock TxLINE adapter: 2-1 home win). Used as a
// fallback only — the resolved outcome is read from Postgres once settled.
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
}

interface ReceiptRow {
  walletAddress: string;
  prediction: "YES" | "NO";
  result: string | null;
  verified: boolean;
  claimTx: string | null;
}

interface MarketView {
  question: string;
  status: string;
  winningSide: "YES" | "NO" | null;
  vaultPda: string | null;
  receipts: ReceiptRow[];
  settlement: {
    winningSide: "YES" | "NO" | null;
    merkleRoot: string;
    settleTx: string | null;
    voided: boolean;
    settledAt: string;
  } | null;
}

export default function MarketProofPage({
  params,
}: {
  params: { matchId: string; marketId: string };
}) {
  const { matchId, marketId } = params;
  const market = marketPda(matchId, marketId);
  const vault = vaultPda(market);

  const [data, setData] = useState<MarketView | null>(null);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/markets/${matchId}/${marketId}`)
      .then((r) => r.json())
      .then((d) => {
        setData((d.market as MarketView) ?? null);
        setTxs((d.transactions ?? []) as TxRow[]);
      })
      .catch(() => {
        setData(null);
        setTxs([]);
      })
      .finally(() => setLoaded(true));
  }, [matchId, marketId]);

  const settled = !!data?.settlement;
  const voided = data?.settlement?.voided ?? false;
  const dbWin = data?.settlement?.winningSide ?? data?.winningSide ?? null;
  const resultLabel = voided ? "VOID" : dbWin ?? (DEMO_RESULT[marketId] === 1 ? "YES" : "NO");

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
        {data?.question ?? QUESTIONS[marketId] ?? marketId} ·{" "}
        {settled ? (
          <>
            resolved <span className="font-black text-ink">{resultLabel}</span>
          </>
        ) : (
          <span className="font-black text-amber-600">{loaded ? "not settled yet" : "loading…"}</span>
        )}
      </p>

      <div className="mt-4 space-y-2">
        <Addr label="Escrow (vault)" value={(data?.vaultPda ?? vault.toBase58())} />
        <Addr label="Market PDA" value={market.toBase58()} />
      </div>

      {data?.settlement && (
        <div className="mt-4 rounded-2xl border border-[#e2e8f0] bg-white px-5 py-4 shadow-card">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Settlement</div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-slate-500">Merkle root</span>
            <span className="font-mono text-[12px] text-ink">
              {data.settlement.merkleRoot.slice(0, 10)}…{data.settlement.merkleRoot.slice(-6)}
            </span>
          </div>
          {data.settlement.settleTx && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-slate-500">Settle tx</span>
              <a href={explorer("tx", data.settlement.settleTx)} target="_blank" rel="noreferrer" className="font-mono text-[12px] text-[#16a34a] hover:underline">
                {data.settlement.settleTx.slice(0, 8)}… ↗
              </a>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <MerkleVerifyPanel matchId={matchId} marketId={marketId} stats={DEMO_RESULT} />
      </div>

      {data && data.receipts.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[#e2e8f0] bg-white px-5 py-4 shadow-card">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Claim receipts</div>
          <ul className="mt-2 divide-y divide-slate-100">
            {data.receipts.map((r) => (
              <li key={r.walletAddress} className="flex items-center justify-between py-2">
                <span className="font-mono text-[12px] text-slate-500">
                  {r.walletAddress.slice(0, 4)}…{r.walletAddress.slice(-4)}
                </span>
                <span className="flex items-center gap-2 text-[12px]">
                  <span className="font-bold text-ink">{r.prediction}</span>
                  {r.verified && <Check weight="bold" size={13} className="text-[#16a34a]" />}
                  {r.claimTx && (
                    <a href={explorer("tx", r.claimTx)} target="_blank" rel="noreferrer" className="font-mono text-[#16a34a] hover:underline">
                      {r.claimTx.slice(0, 6)}… ↗
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-[#e2e8f0] bg-white px-5 py-4 shadow-card">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">On-chain transactions</div>
        {txs.length === 0 ? (
          <p className="mt-2 text-[13px] text-slate-500">
            {loaded ? "No indexed transactions yet for this market." : "Loading…"}
          </p>
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
