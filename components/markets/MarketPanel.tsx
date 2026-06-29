"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import type { Match } from "@/lib/predict/types";
import { MARKET_DISCLAIMER } from "@/lib/markets/flags";
import { formatAmount, parseAmount, GOLAZO_SPL } from "@/lib/markets/assets/types";
import { estimatePayout, impliedProbability } from "@/lib/markets/payout";
import { statusLabel, canStake, canClaim, canRefund, MARKET_STATUS } from "@/lib/markets/status";
import {
  useGolazoProgram,
  useTxlineProgram,
  getGolazoBalance,
  faucet,
  stake,
  claim,
  initMarket,
  settleMarket,
  fetchMarket,
  type MarketState,
} from "@/lib/chain/client";
import { GOLAZO_MINT } from "@/lib/chain/constants";
import { mirrorTx } from "@/lib/markets/mirror";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false },
);

const FAUCET_AMOUNT = 100_000_000n; // 100 GOLAZO

function marketsFor(match: Match) {
  return [
    { id: "home_win", q: `Will ${match.home.name} win?` },
    { id: "over25", q: "Over 2.5 total goals?" },
    { id: "btts", q: "Both teams to score?" },
  ];
}

// Demo binary result (matches the Mock TxLINE adapter's 2-1 home win).
const DEMO_RESULT: Record<string, 0 | 1> = { home_win: 1, over25: 1, btts: 0 };

export default function MarketPanel({ match }: { match: Match }) {
  const { publicKey, connected } = useWallet();
  const golazo = useGolazoProgram();
  const txline = useTxlineProgram();
  const markets = useMemo(() => marketsFor(match), [match]);

  const [marketId, setMarketId] = useState(markets[0].id);
  const [amountStr, setAmountStr] = useState("10");
  const [side, setSide] = useState<0 | 1>(1);
  const [balance, setBalance] = useState<bigint>(0n);
  const [state, setState] = useState<MarketState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const question = markets.find((m) => m.id === marketId)!.q;

  const refresh = useCallback(async () => {
    if (!golazo || !publicKey) return;
    const [bal, mkt] = await Promise.all([
      getGolazoBalance(golazo.provider.connection, publicKey),
      fetchMarket(golazo, match.id, marketId),
    ]);
    setBalance(bal);
    setState(mkt);
  }, [golazo, publicKey, match.id, marketId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (label: string, fn: () => Promise<string>) => {
    if (!golazo || !publicKey) return;
    setBusy(label);
    setMsg(null);
    try {
      const sig = await fn();
      setMsg(`✓ ${label} confirmed`);
      void mirrorTx({ signature: sig, wallet: publicKey.toBase58(), matchId: match.id, marketId, kind: label });
      await refresh();
    } catch (e: any) {
      setMsg(`× ${label} failed: ${(e?.message ?? String(e)).slice(0, 120)}`);
    } finally {
      setBusy(null);
    }
  };

  const amount = (() => {
    try {
      return parseAmount(amountStr || "0", GOLAZO_SPL.decimals);
    } catch {
      return 0n;
    }
  })();

  const yesTotal = state?.yesTotal ?? 0n;
  const noTotal = state?.noTotal ?? 0n;
  const pool = yesTotal + noTotal;
  const payout = estimatePayout(side, amount, yesTotal, noTotal);
  const lockTs = state?.lockTs ?? Math.floor(match.lockMs / 1000);
  const status = state?.status ?? MARKET_STATUS.OPEN;

  if (!connected) {
    return (
      <div className="rounded-2xl border border-[#26262b] bg-ink px-5 py-6 text-white">
        <div className="text-[13px] font-bold uppercase tracking-[0.12em] text-neon">Market Mode</div>
        <p className="mt-2 text-[14px] text-slate-300">
          Connect a Solana devnet wallet to stake demo GOLAZO on a verified YES/NO market.
        </p>
        <div className="mt-4">
          <WalletMultiButton style={{ background: "#d4ff3f", color: "#0a0a0a", borderRadius: 9999, height: 44 }} />
        </div>
        <p className="mt-3 text-[11px] font-semibold text-slate-500">{MARKET_DISCLAIMER}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#26262b] bg-ink px-5 py-5 text-white">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-bold uppercase tracking-[0.12em] text-neon">Market Mode</div>
        <span className="rounded-full border border-slate-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-300">
          {statusLabel(status)}
        </span>
      </div>

      {/* market selector */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {markets.map((m) => (
          <button
            key={m.id}
            onClick={() => setMarketId(m.id)}
            className={
              "rounded-full px-3 py-1 text-[12px] font-bold " +
              (m.id === marketId ? "bg-neon text-ink" : "bg-[#1c1c22] text-slate-300")
            }
          >
            {m.id}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[16px] font-extrabold">{question}</p>

      {/* pool + balance */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-[#15151a] py-2">
          <div className="text-[9px] uppercase tracking-wide text-slate-500">Pool</div>
          <div className="text-[15px] font-black tabular-nums">{formatAmount(pool, 6)}</div>
        </div>
        <div className="rounded-xl bg-[#15151a] py-2">
          <div className="text-[9px] uppercase tracking-wide text-slate-500">Balance</div>
          <div className="text-[15px] font-black tabular-nums">{formatAmount(balance, 6)}</div>
        </div>
      </div>

      {/* YES / NO selector (always visible) with live implied odds */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {([1, 0] as const).map((s) => {
          const pct = Math.round(impliedProbability(s, yesTotal, noTotal) * 100);
          const active = side === s;
          return (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={
                "flex flex-col items-center rounded-xl py-2.5 " +
                (active ? "bg-neon text-ink" : "bg-[#1c1c22] text-slate-200")
              }
            >
              <span className="text-[16px] font-black">{s === 1 ? "YES" : "NO"}</span>
              <span className={"text-[11px] font-bold " + (active ? "text-ink/70" : "text-slate-500")}>
                {pct}%
              </span>
            </button>
          );
        })}
      </div>

      {/* amount + payout */}
      <div className="mt-3 flex items-center gap-2">
        <input
          inputMode="decimal"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          className="w-full rounded-xl bg-[#15151a] px-3 py-2.5 text-[15px] font-bold text-white outline-none"
          placeholder="Amount"
        />
        <span className="text-[13px] font-bold text-slate-400">GOLAZO</span>
      </div>
      <div className="mt-1.5 text-[12px] font-semibold text-slate-400">
        Est. payout if {side === 1 ? "YES" : "NO"} wins:{" "}
        <span className="text-neon">{formatAmount(payout, 6)} GOLAZO</span>
      </div>

      {/* stake (opens the market first if it doesn't exist yet) + faucet */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          disabled={!!busy || (!!state && !canStake(status, lockTs))}
          onClick={() =>
            run(state ? "stake" : "init_market", async () => {
              if (!state) {
                await initMarket(golazo!, publicKey!, match.id, marketId, question, lockTs);
              }
              return stake(golazo!, publicKey!, match.id, marketId, side, amount);
            })
          }
          className="rounded-full bg-neon py-2.5 text-[13px] font-extrabold text-ink disabled:opacity-40"
        >
          {busy ? "…" : state ? `Stake ${side === 1 ? "YES" : "NO"}` : "Open & stake"}
        </button>
        <button
          disabled={!!busy || balance > 0n}
          onClick={() => run("faucet", () => faucet(golazo!, publicKey!, FAUCET_AMOUNT))}
          className="rounded-full border border-slate-600 py-2.5 text-[13px] font-bold text-slate-200 disabled:opacity-40"
        >
          {busy === "faucet" ? "…" : "Faucet 100"}
        </button>
      </div>

      {state && (
        <>
          {/* keeper settle + claim/refund */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            {canClaim(status) ? (
              <button
                disabled={!!busy}
                onClick={() => run("claim", () => claim(golazo!, publicKey!, match.id, marketId, "claim"))}
                className="rounded-full bg-neon py-2.5 text-[13px] font-extrabold text-ink disabled:opacity-40"
              >
                {busy === "claim" ? "Claiming…" : "Claim"}
              </button>
            ) : canRefund(status) ? (
              <button
                disabled={!!busy}
                onClick={() => run("refund", () => claim(golazo!, publicKey!, match.id, marketId, "refund"))}
                className="rounded-full bg-amber-400 py-2.5 text-[13px] font-extrabold text-ink disabled:opacity-40"
              >
                {busy === "refund" ? "Refunding…" : "Refund"}
              </button>
            ) : (
              <button
                disabled={!!busy || status === MARKET_STATUS.SETTLED}
                onClick={() => run("settle", () => settleMarket(golazo!, txline!, publicKey!, match.id, marketId, DEMO_RESULT))}
                className="rounded-full border border-neon py-2.5 text-[13px] font-bold text-neon disabled:opacity-40"
              >
                {busy === "settle" ? "Settling…" : "Settle (keeper)"}
              </button>
            )}
            <a
              href={`/markets/${match.id}/${marketId}/proof`}
              className="flex items-center justify-center rounded-full border border-slate-600 py-2.5 text-[13px] font-bold text-slate-200"
            >
              Proof receipt ▸
            </a>
          </div>
        </>
      )}

      {msg && <p className="mt-3 text-[12px] font-semibold text-slate-300">{msg}</p>}
      <p className="mt-3 text-[11px] font-semibold text-slate-500">
        {MARKET_DISCLAIMER} Mint: {GOLAZO_MINT.toBase58().slice(0, 4)}…{GOLAZO_MINT.toBase58().slice(-4)}
      </p>
    </div>
  );
}
