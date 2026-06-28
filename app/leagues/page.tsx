"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { League } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[] | null>(null);
  useEffect(() => {
    void dataSource.getMyLeagues().then(setLeagues);
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-xl font-black tracking-tight">Your leagues</h1>
      {leagues === null ? (
        <p className="text-slate-400">Loading…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {leagues.map((l) => (
            <Link
              key={l.code}
              href={`/leagues/${l.code}`}
              className="flex items-center justify-between rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3 shadow-card hover:border-slate-300"
            >
              <span className="font-extrabold">{l.name}</span>
              <span className="text-sm font-bold text-slate-500">#{l.yourRank} of {l.memberCount}</span>
            </Link>
          ))}
          <button type="button" className="rounded-2xl bg-ink px-4 py-3 text-sm font-black text-neon">
            ＋ Create or join a league
          </button>
        </div>
      )}
    </div>
  );
}
