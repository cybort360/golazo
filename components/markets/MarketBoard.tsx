"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import type { Match } from "@/lib/predict/types";
import TeamAvatar from "@/components/predict/TeamAvatar";
import { MARKET_DISCLAIMER } from "@/lib/markets/flags";
import { formatAmount, parseAmount, GOLAZO_SPL } from "@/lib/markets/assets/types";
import { statusLabel, canStake, canClaim, canRefund, MARKET_STATUS } from "@/lib/markets/status";
import {
  buildSubMarkets,
  computeBoard,
  formatShare,
  formatOdds,
  demoStats,
  type SubMarketId,
} from "@/lib/markets/board";
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
import { marketPda, vaultPda } from "@/lib/chain/pdas";
import { toHex } from "@/lib/txline/merkle";
import { buildMatchProof, proofForStat } from "@/lib/txline/proof";
import { mirrorTx } from "@/lib/markets/mirror";
import { mirrorSettlement, mirrorReceipt } from "@/lib/markets/index-writes";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false },
);

const FAUCET_AMOUNT = 100_000_000n; // 100 GOLAZO
const MIN_SOL_LAMPORTS = 0.02 * LAMPORTS_PER_SOL;

function timeChip(match: Match): string {
  if (match.state === "LIVE" && match.minute != null) return `${match.minute}'`;
  if (match.state === "HT") return "HT";
  if (match.state === "FT" || match.state === "VOID") return "FT";
  const ms = match.kickoffMs - Date.now();
  if (ms <= 0) return "LIVE";
  const h = Math.round(ms / 3_600_000);
  if (h >= 24) return `${Math.round(h / 24)}D`;
  if (h >= 1) return `${h}H`;
  return `${Math.max(1, Math.round(ms / 60_000))}M`;
}

export default function MarketBoard({ match }: { match: Match }) {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const golazo = useGolazoProgram();
  const txline = useTxlineProgram();
  const subs = useMemo(() => buildSubMarkets(match), [match]);

  const [subId, setSubId] = useState<SubMarketId>("winner");
  const [selected, setSelected] = useState<string | null>(null);
  const [amountStr, setAmountStr] = useState("10");
  const [balance, setBalance] = useState<bigint>(0n);
  const [sol, setSol] = useState(0);
  const [pools, setPools] = useState<Record<string, MarketState | null>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const sub = subs.find((s) => s.id === subId)!;
  const outcomeIds = useMemo(() => sub.outcomes.map((o) => o.id).join(","), [sub]);

  const refresh = useCallback(async () => {
    if (!golazo || !publicKey) return;
    const ids = outcomeIds.split(",");
    const [bal, lamports, states] = await Promise.all([
      getGolazoBalance(connection, publicKey),
      connection.getBalance(publicKey).catch(() => 0),
      Promise.all(ids.map((id) => fetchMarket(golazo, match.id, id).catch(() => null))),
    ]);
    setBalance(bal);
    setSol(lamports);
    setPools((prev) => {
      const next = { ...prev };
      ids.forEach((id, i) => (next[id] = states[i]));
      return next;
    });
  }, [golazo, publicKey, connection, match.id, outcomeIds]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // reset the focused outcome when switching sub-markets
  useEffect(() => setSelected(null), [subId]);

  const lowSol = sol < MIN_SOL_LAMPORTS;

  const board = useMemo(
    () =>
      computeBoard(
        sub.outcomes.map((o) => {
          const st = pools[o.id];
          return { id: o.id, label: o.label, stake: (st?.yesTotal ?? 0n) + (st?.noTotal ?? 0n) };
        }),
      ),
    [sub, pools],
  );

  const amount = (() => {
    try {
      return parseAmount(amountStr || "0", GOLAZO_SPL.decimals);
    } catch {
      return 0n;
    }
  })();

  const selectedState = selected ? pools[selected] ?? null : null;
  const selectedLabel = sub.outcomes.find((o) => o.id === selected)?.label ?? "";
  const status = selectedState?.status ?? MARKET_STATUS.OPEN;
  const lockTs = selectedState?.lockTs ?? Math.floor(match.lockMs / 1000);

  const run = async (label: string, fn: () => Promise<string>, after?: (sig: string) => void) => {
    if (!golazo || !publicKey || !selected) return;
    setBusy(label);
    setMsg(null);
    try {
      const sig = await fn();
      setMsg(`${label} confirmed`);
      void mirrorTx({ signature: sig, wallet: publicKey.toBase58(), matchId: match.id, marketId: selected, kind: label });
      after?.(sig);
      await refresh();
    } catch (e: any) {
      setMsg(`× ${label} failed: ${(e?.message ?? String(e)).slice(0, 120)}`);
    } finally {
      setBusy(null);
    }
  };

  const getDevnetSol = async () => {
    if (!publicKey) return;
    setBusy("airdrop");
    setMsg(null);
    try {
      const sig = await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, "confirmed");
      setMsg("Airdropped 1 devnet SOL");
      await refresh();
    } catch {
      setMsg("× Devnet airdrop is rate-limited. Grab some at faucet.solana.com, then retry");
    } finally {
      setBusy(null);
    }
  };

  const indexSettlement = (marketId: string) => (sig: string) => {
    const stats = demoStats();
    const bigStats = Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, BigInt(v)]));
    const { root } = buildMatchProof(match.id, bigStats);
    const { claimedValue, proof } = proofForStat(match.id, bigStats, marketId);
    const st = pools[marketId];
    void mirrorSettlement({
      matchId: match.id,
      marketId,
      winningSide: claimedValue === 1n ? "YES" : "NO",
      claimedValue: Number(claimedValue),
      merkleRoot: toHex(root),
      proof: proof.map(toHex),
      settleTx: sig,
      yesTotal: (st?.yesTotal ?? 0n).toString(),
      noTotal: (st?.noTotal ?? 0n).toString(),
      question: sub.question,
      lockTs: lockTs * 1000,
      match: {
        homeTeam: match.home.name,
        awayTeam: match.away.name,
        kickoff: new Date(match.lockMs).toISOString(),
      },
      vaultPda: vaultPda(marketPda(match.id, marketId)).toBase58(),
      mint: GOLAZO_MINT.toBase58(),
    });
  };

  const indexReceipt = (marketId: string, kind: "claim" | "refund") => (sig: string) => {
    void mirrorReceipt({
      matchId: match.id,
      marketId,
      wallet: publicKey!.toBase58(),
      prediction: "YES",
      result: kind === "refund" ? "VOID" : demoStats()[marketId] === 1 ? "YES" : "NO",
      verified: true,
      escrowAddress: vaultPda(marketPda(match.id, marketId)).toBase58(),
      claimTx: sig,
    });
  };

  const cardBase = "rounded-2xl border border-[#1b2532] bg-[#0b0f16] text-white";
  const cols = sub.outcomes.length === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <div className={cardBase + " overflow-hidden"}>
      {/* neon top hairline — a small Golazo signature on the card */}
      <div className="h-[3px] w-full bg-gradient-to-r from-neon/0 via-neon/70 to-neon/0" />
      <div className="p-4 sm:p-5">
        {/* header: meta + status on top, teams below (with avatars) */}
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {[match.competition || "World Cup", match.round].filter(Boolean).join(" · ")}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-white/12 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-300">
              {match.state === "LIVE" && <span className="glz-blink h-1.5 w-1.5 rounded-full bg-neon" />}
              {timeChip(match)}
            </span>
            <span
              className={
                "rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] " +
                (status === MARKET_STATUS.OPEN ? "bg-neon/15 text-neon" : "border border-white/12 text-slate-400")
              }
            >
              {statusLabel(status)}
            </span>
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2.5">
          <TeamAvatar team={match.home} size={26} />
          <span className="min-w-0 flex-1 truncate text-[18px] font-black tracking-[-0.02em]">{match.home.name}</span>
          <span className="shrink-0 text-[13px] font-black text-neon">v</span>
          <span className="min-w-0 flex-1 truncate text-right text-[18px] font-black tracking-[-0.02em]">{match.away.name}</span>
          <TeamAvatar team={match.away} size={26} />
        </div>

        {/* sub-market tabs */}
        <div className="mt-3.5 flex flex-wrap gap-2">
          {subs.map((s) => {
            const on = s.id === subId;
            return (
              <button
                key={s.id}
                onClick={() => setSubId(s.id)}
                className={
                  "rounded-lg px-3 py-1.5 text-[12px] font-bold transition-colors " +
                  (on
                    ? "border border-neon/60 bg-neon/10 text-neon"
                    : "border border-[#1e293b] text-slate-400 hover:text-slate-200")
                }
              >
                {s.tab}
                {s.note ? <span className="ml-1 text-[10px] font-semibold opacity-70">· {s.note}</span> : null}
              </button>
            );
          })}
        </div>

        {/* outcome cards */}
        <div className={"mt-3.5 grid gap-2.5 " + cols}>
          {board.rows.map((r) => {
            const isLeader = r.id === board.leaderId;
            const isSel = r.id === selected;
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={
                  "flex flex-col rounded-2xl border px-3 py-3 text-left transition-colors " +
                  (isSel
                    ? "border-neon bg-neon/[0.06] shadow-[0_0_0_1px_#d4ff3f_inset]"
                    : "border-[#1c2634] bg-[#0e131c] hover:border-[#2a3646]")
                }
              >
                <span className="truncate text-[13px] font-bold text-slate-300">{r.label}</span>
                <span className={"mt-1 text-[26px] font-black leading-none tabular-nums " + (isLeader ? "text-neon" : "text-white")}>
                  {formatShare(r.share, board.total > 0n)}
                </span>
                <span className="mt-1 text-[12px] font-semibold tabular-nums text-slate-500">@ {formatOdds(r.odds)}</span>
                <span className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                  <span
                    className={"block h-full rounded-full " + (isLeader ? "bg-neon" : "bg-teal-400/80")}
                    style={{ width: `${Math.max(r.share * 100, board.total > 0n && r.stake > 0n ? 4 : 0)}%` }}
                  />
                </span>
              </button>
            );
          })}
        </div>

        {/* connect CTA when no wallet, else a hint until an outcome is picked */}
        {!connected && (
          <div className="mt-3.5 rounded-2xl border border-[#1c2634] bg-[#0e131c] p-4 text-center">
            <p className="text-[13px] font-semibold text-slate-400">
              Connect a Solana devnet wallet to back an outcome with demo GOLAZO.
            </p>
            <div className="mt-3 flex justify-center">
              <WalletMultiButton style={{ background: "#d4ff3f", color: "#0a0a0a", borderRadius: 9999, height: 42 }} />
            </div>
          </div>
        )}
        {connected && !selected && (
          <p className="mt-3.5 text-center text-[12px] font-semibold text-slate-500">Tap an outcome to back it.</p>
        )}

        {/* stake / manage the focused outcome */}
        {connected && selected && (
          <div className="mt-3.5 rounded-2xl border border-[#1c2634] bg-[#0e131c] p-3.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span>
                Backing <span className="text-white">{selectedLabel}</span>
              </span>
              <span className="tabular-nums">Balance {formatAmount(balance, 6)}</span>
            </div>

            {lowSol && (
              <div className="mt-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
                <p className="text-[11px] leading-relaxed text-amber-200/90">
                  Your wallet needs a little devnet SOL for fees (devnet only, not real money).
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={getDevnetSol}
                    disabled={!!busy}
                    className="rounded-full bg-amber-400 px-3 py-1.5 text-[11px] font-black text-ink disabled:opacity-40"
                  >
                    {busy === "airdrop" ? "…" : "Get 1 devnet SOL"}
                  </button>
                  <a
                    href="https://faucet.solana.com"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-amber-400/50 px-3 py-1.5 text-[11px] font-bold text-amber-200"
                  >
                    Faucet ↗
                  </a>
                </div>
              </div>
            )}

            <div className="mt-2.5 flex items-center gap-2">
              <input
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full rounded-xl bg-[#0b0f16] px-3 py-2.5 text-[15px] font-bold text-white outline-none ring-1 ring-inset ring-[#1c2634] focus:ring-neon/50"
                placeholder="Amount"
              />
              <span className="text-[12px] font-bold text-slate-500">GOLAZO</span>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                disabled={!!busy || lowSol || (!!selectedState && !canStake(status, lockTs)) || amount <= 0n}
                onClick={() =>
                  run(selectedState ? "stake" : "init_market", async () => {
                    if (!selectedState) await initMarket(golazo!, publicKey!, match.id, selected!, sub.question, lockTs);
                    return stake(golazo!, publicKey!, match.id, selected!, 1, amount);
                  })
                }
                className="rounded-full bg-neon py-2.5 text-[13px] font-extrabold text-ink disabled:opacity-40"
              >
                {busy ? "…" : selectedState ? `Back ${selectedLabel}` : "Open & back"}
              </button>
              <button
                disabled={!!busy || lowSol || balance > 0n}
                onClick={() => run("faucet", () => faucet(golazo!, publicKey!, FAUCET_AMOUNT))}
                className="rounded-full border border-[#2a3646] py-2.5 text-[13px] font-bold text-slate-200 disabled:opacity-40"
              >
                {busy === "faucet" ? "…" : "Faucet 100"}
              </button>
            </div>

            {selectedState && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {canClaim(status) ? (
                  <button
                    disabled={!!busy || lowSol}
                    onClick={() => run("claim", () => claim(golazo!, publicKey!, match.id, selected!, "claim"), indexReceipt(selected!, "claim"))}
                    className="rounded-full bg-neon py-2.5 text-[13px] font-extrabold text-ink disabled:opacity-40"
                  >
                    {busy === "claim" ? "Claiming…" : "Claim"}
                  </button>
                ) : canRefund(status) ? (
                  <button
                    disabled={!!busy || lowSol}
                    onClick={() => run("refund", () => claim(golazo!, publicKey!, match.id, selected!, "refund"), indexReceipt(selected!, "refund"))}
                    className="rounded-full bg-amber-400 py-2.5 text-[13px] font-extrabold text-ink disabled:opacity-40"
                  >
                    {busy === "refund" ? "Refunding…" : "Refund"}
                  </button>
                ) : (
                  <button
                    disabled={!!busy || lowSol || status === MARKET_STATUS.SETTLED}
                    onClick={() => run("settle", () => settleMarket(golazo!, txline!, publicKey!, match.id, selected!, demoStats()), indexSettlement(selected!))}
                    className="rounded-full border border-neon/70 py-2.5 text-[13px] font-bold text-neon disabled:opacity-40"
                  >
                    {busy === "settle" ? "Settling…" : "Settle (keeper)"}
                  </button>
                )}
                <a
                  href={`/markets/${match.id}/${selected}/proof`}
                  className="flex items-center justify-center rounded-full border border-[#2a3646] py-2.5 text-[13px] font-bold text-slate-200"
                >
                  Proof receipt ▸
                </a>
              </div>
            )}

            {msg && <p className="mt-2.5 text-[12px] font-semibold text-slate-300">{msg}</p>}
          </div>
        )}

        {/* footer: live pool + our own verified-settlement framing */}
        <div className="mt-4 flex items-center justify-between border-t border-[#141c28] pt-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-neon" />
            Pool <span className="tabular-nums text-white">{formatAmount(board.total, 6)}</span> GOLAZO
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
            <ShieldCheck weight="fill" size={13} className="text-neon" /> Proof-settled on Solana
          </span>
        </div>
        <p className="mt-2 text-[10px] font-semibold text-slate-600">{MARKET_DISCLAIMER}</p>
      </div>
    </div>
  );
}
