"use client";

import { useEffect, useState } from "react";
import type { Match } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import MatchListItem from "@/components/predict/MatchListItem";

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[] | null>(null);
  useEffect(() => {
    void dataSource.getMatches().then(setMatches);
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-xl font-black tracking-tight">Matches</h1>
      {matches === null ? (
        <p className="text-slate-400">Loading…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {matches.map((m) => <MatchListItem key={m.id} match={m} />)}
        </div>
      )}
    </div>
  );
}
