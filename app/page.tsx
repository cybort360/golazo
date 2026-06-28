"use client";

import { useEffect, useState } from "react";
import type { Match, League, ProofReceipt } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import HomeDashboard from "@/components/predict/HomeDashboard";

export default function Home() {
  const [data, setData] = useState<{
    liveMatches: Match[]; leagues: League[]; receipts: ProofReceipt[];
  } | null>(null);

  useEffect(() => {
    void Promise.all([
      dataSource.getMatches(),
      dataSource.getMyLeagues(),
      dataSource.getRecentReceipts(1),
    ]).then(([matches, leagues, receipts]) =>
      setData({ liveMatches: matches.filter((m) => m.state === "LIVE"), leagues, receipts }),
    );
  }, []);

  if (!data) return <div className="px-4 py-10 text-center text-slate-400">Loading…</div>;
  return <HomeDashboard {...data} />;
}
