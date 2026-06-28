"use client";

import { useEffect, useState } from "react";
import type { Match } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import MatchListItem from "@/components/predict/MatchListItem";
import MatchesDesktop from "@/components/predict/MatchesDesktop";

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[] | null>(null);
  useEffect(() => {
    void dataSource.getMatches().then(setMatches);
  }, []);

  if (matches === null) return <div className="px-4 py-10 text-center text-slate-400">Loading…</div>;

  return (
    <>
      {/* mobile (<lg) */}
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 md:px-8 md:py-8 lg:hidden">
        <h1 className="text-xl font-black tracking-tight">Matches</h1>
        <div className="flex flex-col gap-2">
          {matches.map((m) => <MatchListItem key={m.id} match={m} />)}
        </div>
      </div>
      {/* desktop (lg+) */}
      <MatchesDesktop matches={matches} />
    </>
  );
}
