"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Match, MarketId } from "@/lib/predict/types";
import { buildMarkets } from "@/lib/predict/markets";
import { isPickOpen, existingPicksToState, MARKET_TITLES } from "@/lib/predict/pick-rules";
import { submitPicks } from "@/lib/predict/submitPicks";
import { useExistingPicks } from "@/components/predict/useExistingPicks";
import MarketPicker from "@/components/predict/MarketPicker";
import MarketConsensus from "@/components/predict/MarketConsensus";
import { MatchHeaderMobile } from "@/components/predict/MatchHeader";
import { CheckCircle, Lock } from "@phosphor-icons/react/dist/ssr";

export default function MatchPickScreen({ match, toggle }: { match: Match; toggle?: ReactNode }) {
  const markets = buildMarkets(match);
  const [picks, setPicks] = useState<Partial<Record<MarketId, string>>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  // Picks lock at kickoff. Tick every second so the screen closes the instant the
  // match starts, even without a data poll. Once locked, the whole flow is inert.
  const [locked, setLocked] = useState(() => !isPickOpen(match.lockMs, Date.now(), match.state));
  useEffect(() => {
    const tick = () => setLocked(!isPickOpen(match.lockMs, Date.now(), match.state));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [match.lockMs, match.state]);

  // Reflect picks the user already made: pre-select them while still open, list
  // them once locked. Only seed if the user hasn't started a fresh selection.
  const existing = useExistingPicks(match.id);
  const hasExisting = existing.length > 0;
  useEffect(() => {
    if (hasExisting) setPicks((prev) => (Object.keys(prev).length ? prev : existingPicksToState(existing)));
  }, [existing, hasExisting]);

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

  const label =
    status === "saving"
      ? "Locking…"
      : status === "done"
      ? hasExisting
        ? "Picks updated"
        : "Picks locked"
      : `${hasExisting ? "Update" : "Lock"} my picks · ${count} selected`;

  return (
    <div>
      <MatchHeaderMobile match={match} />

      {toggle && <div className="px-4 pt-4">{toggle}</div>}

      <div className="px-4 pt-4">
        <MarketConsensus match={match} />
      </div>

      {/* markets */}
      <div className="flex flex-col gap-3.5 px-4 pb-4 pt-4">
        {markets.map((m) => (
          <MarketPicker
            key={m.id}
            market={m}
            selected={picks[m.id] ?? null}
            onSelect={(opt) => select(m.id, opt)}
            disabled={locked}
          />
        ))}
      </div>

      {/* lock cta */}
      <div className="px-4 pb-6 pt-1">
        {locked ? (
          <>
            {hasExisting ? (
              <div className="rounded-2xl bg-ink px-4 py-4 text-white">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-neon">
                  <Lock weight="fill" size={13} /> Your locked picks
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {existing.map((p) => (
                    <div key={p.marketId} className="flex items-center justify-between rounded-xl bg-[#171717] px-3 py-2.5">
                      <span className="text-[11px] font-semibold text-slate-400">{MARKET_TITLES[p.marketId]}</span>
                      <span className="text-[13px] font-extrabold text-neon">{p.optionLabel}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-4 text-center text-base font-black tracking-[-0.01em] text-slate-400">
                <Lock weight="fill" size={18} /> Picks locked
              </div>
            )}
            <p className="mt-2.5 text-center text-xs font-semibold text-slate-400">
              This match has kicked off. Picks are closed.
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={lock}
              disabled={count === 0 || status === "saving" || status === "done"}
              className={
                "flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-center text-base font-black tracking-[-0.01em] transition-colors disabled:cursor-not-allowed " +
                (status === "done" ? "bg-green-600 text-white" : "bg-neon text-ink disabled:opacity-50")
              }
            >
              {status === "done" && <CheckCircle weight="fill" size={18} />}
              {label}
            </button>
            <p className="mt-2.5 text-center text-xs font-semibold text-slate-400">
              {status === "error"
                ? error ?? "Couldn't save, try again"
                : status === "done"
                ? "Verified results settle automatically. Track them in Receipts."
                : "Playing as guest · no signup needed"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
