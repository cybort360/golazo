"use client";

import { useEffect, useState } from "react";
import type { Match, League, ProofReceipt } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import HomeDashboard from "@/components/predict/HomeDashboard";
import HomeDashboardDesktop from "@/components/predict/HomeDashboardDesktop";

export default function Home() {
  const [data, setData] = useState<{
    matches: Match[]; leagues: League[]; receipts: ProofReceipt[];
  } | null>(null);

  useEffect(() => {
    void Promise.all([
      dataSource.getMatches(),
      dataSource.getMyLeagues(),
      dataSource.getRecentReceipts(2),
    ]).then(([matches, leagues, receipts]) => setData({ matches, leagues, receipts }));
  }, []);

  if (!data) return <div className="px-4 py-10 text-center text-slate-400">Loading…</div>;

  const live = data.matches.filter((m) => m.state === "LIVE");
  return (
    <>
      {/* mobile (<lg) */}
      <HomeDashboard liveMatches={live} leagues={data.leagues} receipts={data.receipts} />
      {/* desktop (lg+) */}
      <HomeDashboardDesktop matches={data.matches} leagues={data.leagues} receipts={data.receipts} />
    </>
  );
}
