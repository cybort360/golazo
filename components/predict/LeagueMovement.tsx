"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPoints } from "@/lib/predict/labels";

// The leaderboard-update moment (PRD §4 step 8): after a pick settles, show how
// it moved the user on their private leaderboard — "+40 pts · up to #2". Reads
// the live delta from the API so it reflects the user's actual standing.
interface Movement {
  code: string;
  name: string;
  rank: number;
  previousRank: number;
  memberCount: number;
  pointsGained: number;
}

function label(m: Movement): string {
  if (m.previousRank > m.rank) return `up to #${m.rank}`;
  if (m.rank === 1) return `held #1`;
  return `now #${m.rank}`;
}

export default function LeagueMovement({ pickId }: { pickId: string }) {
  const [m, setM] = useState<Movement | null>(null);

  useEffect(() => {
    let live = true;
    void fetch(`/api/predict/receipts/${encodeURIComponent(pickId)}/league`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d?.ok && Array.isArray(d.movements) && d.movements.length > 0) setM(d.movements[0]);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [pickId]);

  if (!m) return null;
  const rose = m.previousRank > m.rank;

  return (
    <Link
      href={`/predict/league/${m.code}`}
      className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3.5 transition-colors hover:bg-slate-50"
    >
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Leaderboard</div>
        <div className="mt-0.5 truncate text-sm font-extrabold text-ink">{m.name}</div>
      </div>
      <div className="flex items-center gap-3 whitespace-nowrap">
        {m.pointsGained > 0 && (
          <span className="text-sm font-black text-[#16a34a]">+{formatPoints(m.pointsGained)} pts</span>
        )}
        <span
          className={
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-extrabold " +
            (rose ? "bg-[rgba(212,255,63,0.22)] text-ink" : "bg-slate-100 text-slate-600")
          }
        >
          {rose && <span aria-hidden>▲</span>}
          {label(m)}
        </span>
      </div>
    </Link>
  );
}
