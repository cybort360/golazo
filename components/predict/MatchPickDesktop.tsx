"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Match, MarketId } from "@/lib/predict/types";
import { buildMarkets } from "@/lib/predict/markets";
import { isPickOpen, existingPicksToState, MARKET_TITLES } from "@/lib/predict/pick-rules";
import { useExistingPicks } from "@/components/predict/useExistingPicks";
import MarketPicker from "@/components/predict/MarketPicker";
import MarketConsensus from "@/components/predict/MarketConsensus";
import { MatchHeaderDesktop } from "@/components/predict/MatchHeader";
import { submitPicks } from "@/lib/predict/submitPicks";
import { Lock, CheckCircle } from "@phosphor-icons/react/dist/ssr";

function fmtCountdown(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function MatchPickDesktop({ match, toggle }: { match: Match; toggle?: ReactNode }) {
  const markets = buildMarkets(match);
  const [winner, totals, btts, chaos] = markets;
  const [picks, setPicks] = useState<Partial<Record<MarketId, string>>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const select = (id: MarketId, optionId: string) => {
    if (locked) return;
    setStatus("idle");
    setPicks((p) => ({ ...p, [id]: optionId }));
  };
  const count = Object.keys(picks).length;

  async function lock() {
    if (locked || count === 0 || status === "saving") return;
    setStatus("saving");
    setError(null);
    const res = await submitPicks(match, markets, picks);
    if (res.ok) setStatus("done");
    else {
      setError(res.error);
      setStatus("error");
    }
  }

  // Picks lock at kickoff (time or state, whichever comes first). Tick every
  // second so the slip closes the instant the match starts. `remain` drives the
  // live countdown while picks are still open.
  const [remain, setRemain] = useState<number | null>(null);
  const [locked, setLocked] = useState(() => !isPickOpen(match.lockMs, Date.now(), match.state));
  useEffect(() => {
    const tick = () => {
      setRemain(Math.max(0, match.lockMs - Date.now()));
      setLocked(!isPickOpen(match.lockMs, Date.now(), match.state));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [match.lockMs, match.state]);
  const showLock = !locked && remain !== null && remain > 0;

  // Reflect picks already made: pre-select while open, list once locked.
  const existing = useExistingPicks(match.id);
  const hasExisting = existing.length > 0;
  useEffect(() => {
    if (hasExisting) setPicks((prev) => (Object.keys(prev).length ? prev : existingPicksToState(existing)));
  }, [existing, hasExisting]);

  const slip = markets
    .filter((m) => picks[m.id])
    .map((m) => ({ id: m.id, title: m.title, label: m.options.find((o) => o.id === picks[m.id])?.label ?? "" }));

  return (
    <div className="hidden lg:block">
      <MatchHeaderDesktop match={match} />

      {toggle && <div className="mx-auto max-w-6xl px-8 pt-6">{toggle}</div>}

      {/* markets + slip */}
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_340px] items-start gap-7 px-8 py-7">
        <div className="flex flex-col gap-5">
          <MarketConsensus match={match} />
          <MarketPicker market={winner} selected={picks.winner ?? null} onSelect={(o) => select("winner", o)} disabled={locked} />
          <div className="grid grid-cols-2 gap-5">
            <MarketPicker market={totals} selected={picks.totals ?? null} onSelect={(o) => select("totals", o)} disabled={locked} />
            <MarketPicker market={btts} selected={picks.btts ?? null} onSelect={(o) => select("btts", o)} disabled={locked} />
          </div>
          <MarketPicker market={chaos} selected={picks.chaos ?? null} onSelect={(o) => select("chaos", o)} disabled={locked} />
        </div>

        {/* slip rail */}
        <aside className="sticky top-6 self-start overflow-hidden rounded-2xl bg-ink text-white">
          <div className="flex items-center justify-between px-5 pt-5">
            <span className="text-[11px] font-black uppercase tracking-[0.13em] text-neon">Your slip</span>
            {showLock && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#171717] px-2.5 py-1 text-[11px] font-bold text-slate-300">
                <Lock weight="fill" size={12} /> <span className="font-black tabular-nums text-neon">{remain === null ? "--:--" : fmtCountdown(remain)}</span>
              </span>
            )}
          </div>

          <div className="px-5 pb-2 pt-3">
            {slip.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#2a2a2a] px-3 py-4 text-center text-[12px] font-medium text-slate-500">
                Tap a market to add it to your slip.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {slip.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-xl bg-[#171717] px-3 py-2.5">
                    <span className="text-[11px] font-semibold text-slate-400">{s.title}</span>
                    <span className="text-[13px] font-extrabold text-neon">{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-5 pb-5 pt-2">
            {locked ? (
              <>
                {hasExisting ? (
                  <div className="rounded-2xl bg-[#171717] px-3.5 py-3.5">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-neon">
                      <Lock weight="fill" size={12} /> Your locked picks
                    </div>
                    <div className="mt-2.5 flex flex-col gap-1.5">
                      {existing.map((p) => (
                        <div key={p.marketId} className="flex items-center justify-between rounded-xl bg-[#0f0f0f] px-3 py-2">
                          <span className="text-[11px] font-semibold text-slate-400">{MARKET_TITLES[p.marketId]}</span>
                          <span className="text-[13px] font-extrabold text-neon">{p.optionLabel}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#171717] px-4 py-3.5 text-center text-[15px] font-black text-slate-400">
                    <Lock weight="fill" size={15} /> Picks locked
                  </div>
                )}
                <p className="mt-2.5 text-center text-[11px] font-semibold text-slate-500">
                  This match has kicked off · picks are closed
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={lock}
                  disabled={count === 0 || status === "saving" || status === "done"}
                  className={
                    "flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-center text-[15px] font-black transition-colors disabled:cursor-not-allowed " +
                    (status === "done" ? "bg-green-600 text-white" : "bg-neon text-ink disabled:opacity-50")
                  }
                >
                  {status === "done" && <CheckCircle weight="fill" size={17} />}
                  {status === "saving"
                    ? "Locking…"
                    : status === "done"
                    ? hasExisting
                      ? "Picks updated"
                      : "Picks locked"
                    : `${hasExisting ? "Update" : "Lock"} my picks · ${count} selected`}
                </button>
                <p className="mt-2.5 text-center text-[11px] font-semibold text-slate-500">
                  {status === "error"
                    ? error ?? "Couldn't save, try again"
                    : status === "done"
                    ? "Settles automatically · see Receipts"
                    : "Playing as guest · no signup needed"}
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
