"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import type { League } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import LeagueLeaderboard from "@/components/predict/LeagueLeaderboard";
import LeagueLeaderboardDesktop from "@/components/predict/LeagueLeaderboardDesktop";
import { ScreenSkeleton } from "@/components/predict/Skeleton";

export default function LeaguePage({ params }: { params: { code: string } }) {
  const [league, setLeague] = useState<League | null | undefined>(undefined);
  useEffect(() => {
    void dataSource.getLeague(params.code).then(setLeague);
  }, [params.code]);

  if (league === undefined) return <ScreenSkeleton variant="list" />;
  if (league === null) return notFound();
  return (
    <>
      {/* mobile (<lg) */}
      <div className="pb-6 lg:hidden">
        <LeagueLeaderboard league={league} />
      </div>
      {/* desktop (lg+) */}
      <LeagueLeaderboardDesktop league={league} />
    </>
  );
}
