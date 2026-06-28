"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import type { Match } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import MatchPickScreen from "@/components/predict/MatchPickScreen";
import MatchPickDesktop from "@/components/predict/MatchPickDesktop";

export default function MatchPage({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<Match | null | undefined>(undefined);
  useEffect(() => {
    void dataSource.getMatch(params.id).then(setMatch);
  }, [params.id]);

  if (match === undefined) {
    return <div className="px-4 py-10 text-center text-slate-400">Loading…</div>;
  }
  if (match === null) return notFound();

  return (
    <>
      {/* mobile (<lg) */}
      <div className="lg:hidden">
        <MatchPickScreen match={match} />
      </div>
      {/* desktop (lg+) */}
      <MatchPickDesktop match={match} />
    </>
  );
}
