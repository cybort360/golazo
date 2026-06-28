"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import type { Match } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import MatchPickScreen from "@/components/predict/MatchPickScreen";

export default function MatchPage({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<Match | null | undefined>(undefined);
  useEffect(() => {
    void dataSource.getMatch(params.id).then(setMatch);
  }, [params.id]);

  if (match === undefined) {
    return <div className="mx-auto max-w-md px-4 py-10 text-center text-slate-400">Loading…</div>;
  }
  if (match === null) return notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <MatchPickScreen match={match} />
    </div>
  );
}
