"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GlobalLeaderboard as GlobalLeaderboardData } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import GlobalLeaderboard from "@/components/predict/GlobalLeaderboard";
import GlobalLeaderboardDesktop from "@/components/predict/GlobalLeaderboardDesktop";

export default function LeaderboardPage() {
  const [board, setBoard] = useState<GlobalLeaderboardData | null>(null);
  useEffect(() => {
    void dataSource.getGlobalLeaderboard().then(setBoard);
  }, []);

  if (board === null) return <div className="px-4 py-10 text-center text-slate-400">Loading…</div>;

  return (
    <>
      {/* mobile (<lg) */}
      <div className="pb-6 lg:hidden">
        <GlobalLeaderboard board={board} />
        <div className="px-4 pt-1">
          <Link href="/leagues" className="block rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3.5 text-center text-sm font-bold text-slate-600 shadow-card">
            ‹ Back to your leagues
          </Link>
        </div>
      </div>
      {/* desktop (lg+) */}
      <GlobalLeaderboardDesktop board={board} />
    </>
  );
}
