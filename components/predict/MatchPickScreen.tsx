"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Match, MarketId } from "@/lib/predict/types";
import { buildMarkets } from "@/lib/predict/markets";
import { isPickOpen, existingPicksToState } from "@/lib/predict/pick-rules";
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

  // Reflect picks the user already made. Picks are final once locked, so an
  // existing set makes the whole slip read-only (pre-selected, dimmed) — no edits.
  const existing = useExistingPicks(match.id);
  const hasExisting = existing.length > 0;
  useEffect(() => {
    if (hasExisting) setPicks((prev) => (Object.keys(prev).length ? prev : existingPicksToState(existing)));
  }, [existing, hasExisting]);

  // The user has locked-in picks (this session or a prior one).
  const finalized = hasExisting || status === "done";
  // No selecting/submitting once locked (kickoff) or already finalized.
  const readOnly = locked || finalized;

  const select = (id: MarketId, optionId: string) => {
    if (readOnly) return;
    setStatus("idle");
    setPicks((p) => ({ ...p, [id]: optionId }));
  };
  const count = Object.keys(picks).length;

  async function lock() {
    if (readOnly || count === 0 || status === "saving") return;
    setStatus("saving");
    setError(null);
    const res = await submitPicks(match, markets, picks);
    if (res.ok) setStatus("done");
    else {
      setError(res.error);
      setStatus("error");
    }
  }

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
            disabled={readOnly}
          />
        ))}
      </div>

      {/* lock cta */}
      <div className="px-4 pb-6 pt-1">
        {readOnly ? (
          <>
            <div
              className={
                "flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-center text-base font-black tracking-[-0.01em] " +
                (status === "done" ? "bg-green-600 text-white" : "bg-ink text-slate-300")
              }
            >
              {status === "done" ? <CheckCircle weight="fill" size={18} /> : <Lock weight="fill" size={18} />}
              {finalized ? "Picks locked in" : "Picks locked"}
            </div>
            <p className="mt-2.5 text-center text-xs font-semibold text-slate-400">
              {finalized
                ? "Your picks are final — they can't be changed. They settle automatically in Receipts."
                : "This match has kicked off. Picks are closed."}
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={lock}
              disabled={count === 0 || status === "saving"}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neon px-4 py-4 text-center text-base font-black tracking-[-0.01em] text-ink transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "saving" ? "Locking…" : `Lock my picks · ${count} selected`}
            </button>
            <p className="mt-2.5 text-center text-xs font-semibold text-slate-400">
              {status === "error"
                ? error ?? "Couldn't save, try again"
                : count > 0
                ? "Picks are final once locked — you can't change them after."
                : "Playing as guest · no signup needed"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
