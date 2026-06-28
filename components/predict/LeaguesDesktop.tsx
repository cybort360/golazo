"use client";

import { useState } from "react";
import Link from "next/link";
import type { League, LeagueMember } from "@/lib/predict/types";
import { formatPoints } from "@/lib/predict/labels";

function Avatar({ member, size = 28 }: { member: LeagueMember; size?: number }) {
  if (member.isYou) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-neon bg-[#1e293b] font-extrabold text-neon"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      >
        {member.initials}
      </span>
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-extrabold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background: member.color }}
    >
      {member.initials}
    </span>
  );
}

function Preview({ league }: { league: League }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-card">
      {/* ink header */}
      <div className="bg-ink px-6 pb-5 pt-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Private league</div>
            <div className="mt-1 text-[22px] font-black tracking-[-0.03em]">{league.name}</div>
            <div className="mt-0.5 text-[12px] font-semibold text-slate-400">{league.memberCount} players · season 2 · week 31</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-neon">Your rank</div>
            <div className="text-[28px] font-black leading-none tracking-[-0.04em] tabular-nums">#{league.yourRank}</div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-[12px] border border-dashed border-[#333] bg-[#171717] px-3.5 py-2.5">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">Invite code</div>
            <div className="text-[16px] font-black tracking-[0.04em] tabular-nums text-neon">{league.code}</div>
          </div>
          <button type="button" className="rounded-[9px] bg-neon px-3.5 py-2 text-[12px] font-black text-ink">Share invite</button>
        </div>
      </div>

      {/* top standings preview */}
      <div className="px-3 py-3">
        <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">This week · top 3</div>
        {league.members.slice(0, 3).map((m) => (
          <div
            key={m.userId}
            className={
              "flex items-center gap-3 rounded-[12px] px-3 py-2.5 " +
              (m.isYou ? "bg-ink" : "")
            }
          >
            <span className={"w-4 text-[14px] font-black tabular-nums " + (m.isYou ? "text-neon" : "text-ink")}>{m.rank}</span>
            <Avatar member={m} />
            <span className={"flex-1 truncate text-[13px] font-bold " + (m.isYou ? "text-white" : "text-ink")}>{m.isYou ? "You" : m.name}</span>
            <span className={"text-[14px] font-black tabular-nums " + (m.isYou ? "text-neon" : "text-ink")}>{formatPoints(m.points)}</span>
          </div>
        ))}
      </div>

      {/* open */}
      <div className="px-4 pb-4">
        <Link href={`/leagues/${league.code}`} className="block rounded-xl bg-neon py-3 text-center text-sm font-black text-ink">
          Open league ▸
        </Link>
      </div>
    </div>
  );
}

export default function LeaguesDesktop({ leagues }: { leagues: League[] }) {
  const [selIdx, setSelIdx] = useState(0);
  const selected = leagues[selIdx] ?? null;

  return (
    <div className="hidden lg:block">
      <div className="mx-auto grid max-w-5xl grid-cols-[360px_1fr] items-start gap-7 px-8 py-8">
        {/* left: list */}
        <div>
          <h1 className="mb-4 text-[26px] font-black tracking-[-0.03em]">Your leagues</h1>
          <button type="button" className="w-full rounded-2xl bg-ink px-4 py-3.5 text-center text-sm font-black text-neon transition-transform hover:-translate-y-0.5">
            + Create or join a league
          </button>
          <div className="mt-3 flex flex-col gap-2">
            {leagues.map((l, i) => {
              const active = i === selIdx;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setSelIdx(i)}
                  className={
                    "flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-colors " +
                    (active ? "border-ink bg-white shadow-[0_0_0_2px_#0a0a0a]" : "border-[#e2e8f0] bg-white hover:border-slate-300")
                  }
                >
                  <span className="text-[15px] font-extrabold text-ink">{l.name}</span>
                  <span className="text-[13px] font-bold text-slate-500">#{l.yourRank} of {l.memberCount}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* right: preview */}
        {selected ? (
          <Preview league={selected} />
        ) : (
          <div className="rounded-2xl border border-dashed border-[#e2e8f0] bg-white px-6 py-16 text-center text-sm font-medium text-slate-400">
            Create or join a league to see it here.
          </div>
        )}
      </div>
    </div>
  );
}
