"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Match, MarketId } from "@/lib/predict/types";
import { buildMarkets } from "@/lib/predict/markets";
import { isPickOpen, existingPicksToState } from "@/lib/predict/pick-rules";
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

  // Reflect picks already made. Picks are final once locked, so an existing set
  // makes the whole slip read-only (pre-selected, dimmed) — no edits, no adds.
  const existing = useExistingPicks(match.id);
  const hasExisting = existing.length > 0;
  useEffect(() => {
    if (hasExisting) setPicks((prev) => (Object.keys(prev).length ? prev : existingPicksToState(existing)));
  }, [existing, hasExisting]);

  const finalized = hasExisting || status === "done"; // this user has locked-in picks
  const readOnly = locked || finalized;
  const showCountdown = !readOnly && remain !== null && remain > 0;

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
          <MarketPicker market={winner} selected={picks.winner ?? null} onSelect={(o) => select("winner", o)} disabled={readOnly} />
          <div className="grid grid-cols-2 gap-5">
            <MarketPicker market={totals} selected={picks.totals ?? null} onSelect={(o) => select("totals", o)} disabled={readOnly} />
            <MarketPicker market={btts} selected={picks.btts ?? null} onSelect={(o) => select("btts", o)} disabled={readOnly} />
          </div>
          <MarketPicker market={chaos} selected={picks.chaos ?? null} onSelect={(o) => select("chaos", o)} disabled={readOnly} />
        </div>

        {/* slip rail */}
        <aside className="sticky top-6 self-start overflow-hidden rounded-2xl bg-ink text-white">
          <div className="flex items-center justify-between px-5 pt-5">
            <span className="text-[11px] font-black uppercase tracking-[0.13em] text-neon">
              {finalized ? "Your locked picks" : "Your slip"}
            </span>
            {showCountdown && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#171717] px-2.5 py-1 text-[11px] font-bold text-slate-300">
                <Lock weight="fill" size={12} /> <span className="font-black tabular-nums text-neon">{remain === null ? "--:--" : fmtCountdown(remain)}</span>
              </span>
            )}
          </div>

          <div className="px-5 pb-2 pt-3">
            {slip.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#2a2a2a] px-3 py-4 text-center text-[12px] font-medium text-slate-500">
                {readOnly ? "No picks on this match." : "Tap a market to add it to your slip."}
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
            {readOnly ? (
              <>
                <div
                  className={
                    "flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-center text-[15px] font-black " +
                    (status === "done" ? "bg-green-600 text-white" : "bg-[#171717] text-slate-300")
                  }
                >
                  {status === "done" ? <CheckCircle weight="fill" size={16} /> : <Lock weight="fill" size={15} />}
                  {finalized ? "Picks locked in" : "Picks locked"}
                </div>
                <p className="mt-2.5 text-center text-[11px] font-semibold text-slate-500">
                  {finalized
                    ? "Final and can't be changed. Settles automatically · see Receipts."
                    : "This match has kicked off · picks are closed"}
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={lock}
                  disabled={count === 0 || status === "saving"}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neon px-4 py-3.5 text-center text-[15px] font-black text-ink transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "saving" ? "Locking…" : `Lock my picks · ${count} selected`}
                </button>
                <p className="mt-2.5 text-center text-[11px] font-semibold text-slate-500">
                  {status === "error"
                    ? error ?? "Couldn't save, try again"
                    : count > 0
                    ? "Picks are final once locked, no changes after."
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
