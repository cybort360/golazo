"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { League } from "@/lib/predict/types";
import { dataSource } from "@/lib/predict/dataSource";
import LeaguesDesktop from "@/components/predict/LeaguesDesktop";
import { ScreenSkeleton } from "@/components/predict/Skeleton";
import LeagueDialog from "@/components/predict/LeagueDialog";
import { useMe } from "@/components/predict/useMe";
import { Globe } from "@phosphor-icons/react/dist/ssr";

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const me = useMe();
  const isGuest = me?.isGhost !== false;
  useEffect(() => {
    void dataSource.getMyLeagues().then(setLeagues);
  }, []);

  if (leagues === null) return <ScreenSkeleton variant="list" />;

  return (
    <>
      {/* mobile (<lg) — create on top, then list */}
      <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 py-6 md:px-8 md:py-8 lg:hidden">
        <h1 className="text-xl font-black tracking-tight">Your leagues</h1>
        {isGuest ? (
          <Link
            href="/signup"
            className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-center"
          >
            <div className="text-sm font-extrabold text-ink">Leagues are for members</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">
              Create an account to make or join private leagues.
            </div>
            <span className="mt-3 inline-block rounded-full bg-ink px-4 py-2 text-xs font-extrabold text-neon">
              Create account
            </span>
          </Link>
        ) : (
          <LeagueDialog className="rounded-2xl bg-ink px-4 py-3.5 text-sm font-black text-neon" label="＋ Create or join a league" />
        )}
        <Link
          href="/leaderboard"
          className="flex items-center justify-between rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3.5 text-sm font-bold shadow-card hover:border-slate-300"
        >
          <span className="inline-flex items-center gap-1.5"><Globe weight="fill" size={15} className="text-slate-500" /> Global leaderboard</span>
          <span className="text-slate-400">›</span>
        </Link>
        <div className="flex flex-col gap-2">
          {leagues.map((l) => (
            <Link
              key={l.code}
              href={`/leagues/${l.code}`}
              className="flex items-center justify-between rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3.5 shadow-card hover:border-slate-300"
            >
              <span className="font-extrabold">{l.name}</span>
              <span className="text-sm font-bold text-slate-500">#{l.yourRank} of {l.memberCount}</span>
            </Link>
          ))}
        </div>
      </div>
      {/* desktop (lg+) — master-detail */}
      <LeaguesDesktop leagues={leagues} isGuest={isGuest} />
    </>
  );
}
