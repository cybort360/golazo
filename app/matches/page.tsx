"use client";

import { dataSource } from "@/lib/predict/dataSource";
import { usePoll } from "@/components/predict/usePoll";
import MatchListItem from "@/components/predict/MatchListItem";
import MatchesDesktop from "@/components/predict/MatchesDesktop";

export default function MatchesPage() {
  const matches = usePoll(() => dataSource.getMatches());

  if (matches === null) return <div className="px-4 py-10 text-center text-slate-400">Loading…</div>;

  return (
    <>
      {/* mobile (<lg) */}
      <div className="mx-auto flex max-w-2xl flex-col gap-3.5 px-4 py-6 md:px-8 md:py-8 lg:hidden">
        <h1 className="text-2xl font-black tracking-[-0.03em]">Matches</h1>
        <div className="flex gap-2">
          <span className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-extrabold text-white">Today</span>
          <span className="rounded-full bg-[#f1f5f9] px-3.5 py-1.5 text-xs font-bold text-slate-500">Tomorrow</span>
          <span className="rounded-full bg-[#f1f5f9] px-3.5 py-1.5 text-xs font-bold text-slate-500">This week</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {matches.map((m) => <MatchListItem key={m.id} match={m} />)}
        </div>
      </div>
      {/* desktop (lg+) */}
      <MatchesDesktop matches={matches} />
    </>
  );
}
