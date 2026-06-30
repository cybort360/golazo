"use client";

import { useMemo, useState } from "react";
import { dataSource } from "@/lib/predict/dataSource";
import { usePoll } from "@/components/predict/usePoll";
import { ScreenSkeleton } from "@/components/predict/Skeleton";
import MatchListItem from "@/components/predict/MatchListItem";
import MatchesDesktop from "@/components/predict/MatchesDesktop";
import MatchDateTabs from "@/components/predict/MatchDateTabs";
import { filterByDate, type DateFilter } from "@/lib/predict/matchFilter";

export default function MatchesPage() {
  const matches = usePoll(() => dataSource.getMatches());
  const [filter, setFilter] = useState<DateFilter>("today");

  const filtered = useMemo(
    () => (matches ? filterByDate(matches, filter) : []),
    [matches, filter],
  );

  if (matches === null) return <ScreenSkeleton variant="list" />;

  return (
    <>
      {/* mobile (<lg) */}
      <div className="mx-auto flex max-w-2xl flex-col gap-3.5 px-4 py-6 md:px-8 md:py-8 lg:hidden">
        <h1 className="text-2xl font-black tracking-[-0.03em]">Matches</h1>
        <MatchDateTabs value={filter} onChange={setFilter} tone="light" />
        <div className="flex flex-col gap-2.5">
          {filtered.length > 0 ? (
            filtered.map((m) => <MatchListItem key={m.id} match={m} />)
          ) : (
            <div className="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-10 text-center text-sm font-medium text-slate-400">
              No matches {filter === "week" ? "this week" : filter}.
            </div>
          )}
        </div>
      </div>
      {/* desktop (lg+) */}
      <MatchesDesktop matches={filtered} filter={filter} onFilter={setFilter} />
    </>
  );
}
