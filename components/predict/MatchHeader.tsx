"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Match } from "@/lib/predict/types";
import { scoreLabel, matchStateLabel } from "@/lib/predict/labels";
import TeamAvatar from "@/components/predict/TeamAvatar";

function fmtCountdown(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function useLockRemain(lockMs: number, finished: boolean) {
  const [remain, setRemain] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setRemain(Math.max(0, lockMs - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockMs]);
  return { remain, show: !finished && (remain === null || remain > 0) };
}

export function MatchHeaderMobile({ match }: { match: Match }) {
  const liveLabel = matchStateLabel(match);
  const finished = match.state === "FT" || match.state === "VOID";
  const { remain, show: showLock } = useLockRemain(match.lockMs, finished);

  return (
    <div className="bg-ink px-5 pb-5 pt-5 text-white">
      <div className="flex items-center justify-between text-[13px] font-bold text-slate-400">
        <Link href="/matches" className="transition-colors hover:text-white">‹ Back</Link>
        {liveLabel && (
          <span className="inline-flex items-center gap-1.5 text-white">
            <span className="glz-blink h-1.5 w-1.5 rounded-full bg-neon" />
            {liveLabel}
          </span>
        )}
        <span>⋯</span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="w-[92px] text-center">
          <TeamAvatar team={match.home} size={46} />
          <div className="mt-1.5 text-[13px] font-bold">{match.home.name}</div>
        </div>
        <div className="text-center">
          <div className="text-[34px] font-black tracking-[-0.04em]">{scoreLabel(match) || "vs"}</div>
          {match.phaseLabel && <div className="text-[11px] font-semibold text-slate-500">{match.phaseLabel}</div>}
        </div>
        <div className="w-[92px] text-center">
          <TeamAvatar team={match.away} size={46} />
          <div className="mt-1.5 text-[13px] font-bold">{match.away.name}</div>
        </div>
      </div>
      {showLock && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-[#262626] bg-[#171717] px-3.5 py-2.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Picks lock in</span>
          <span className="text-[17px] font-black tabular-nums text-neon">
            {remain === null ? "--:--" : fmtCountdown(remain)}
          </span>
        </div>
      )}
    </div>
  );
}

export function MatchHeaderDesktop({ match }: { match: Match }) {
  const liveLabel = matchStateLabel(match);
  const score = match.homeScore !== null && match.awayScore !== null ? `${match.homeScore} – ${match.awayScore}` : "vs";

  return (
    <div className="bg-ink px-8 pb-7 pt-5 text-white">
      <div className="flex items-center justify-between text-[13px] font-bold text-slate-400">
        <Link href="/matches" className="transition-colors hover:text-white">‹ Back to matches</Link>
        <span className="font-semibold">{match.competition} · {match.round}</span>
      </div>
      <div className="mx-auto mt-5 flex max-w-2xl items-center justify-between">
        <div className="w-32 text-center">
          <TeamAvatar team={match.home} size={56} />
          <div className="mt-2 text-[15px] font-extrabold">{match.home.name}</div>
        </div>
        <div className="text-center">
          <div className="text-[44px] font-black leading-none tracking-[-0.04em] tabular-nums">{score}</div>
          {liveLabel && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-extrabold text-neon">
              <span className="glz-blink h-1.5 w-1.5 rounded-full bg-neon" />{liveLabel}
            </div>
          )}
          {!liveLabel && match.phaseLabel && <div className="mt-2 text-[12px] font-semibold text-slate-500">{match.phaseLabel}</div>}
        </div>
        <div className="w-32 text-center">
          <TeamAvatar team={match.away} size={56} />
          <div className="mt-2 text-[15px] font-extrabold">{match.away.name}</div>
        </div>
      </div>
    </div>
  );
}
