import type { League } from "@/lib/predict/types";
import { formatPoints, formatAccuracy } from "@/lib/predict/labels";

export default function LeagueLeaderboard({ league }: { league: League }) {
  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-3xl border border-[#e2e8f0] bg-[#f8fafc] shadow-card-md">
      <div className="bg-ink px-5 py-4 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Private league</div>
            <div className="text-lg font-black">{league.name} ⚽</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-neutral-400">Your rank</div>
            <div className="text-xl font-black text-neon">
              #{league.yourRank}<span className="text-xs font-bold text-neutral-500">/{league.memberCount}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-[#1f1f1f] px-3 py-2">
          <span className="text-xs text-neutral-300">
            Invite code <span className="font-mono font-black tracking-widest text-neon">{league.code}</span>
          </span>
          <button type="button" className="rounded-full bg-neon px-2.5 py-1 text-[10px] font-black text-ink">Share invite ▸</button>
        </div>
      </div>

      <div className="flex gap-1.5 px-4 pb-1 pt-3">
        <button type="button" className="rounded-full bg-ink px-3 py-1.5 text-xs font-extrabold text-white">This week</button>
        <button type="button" className="rounded-full border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-bold text-slate-500">All time</button>
      </div>

      <div className="flex flex-col gap-1.5 px-4 pb-5 pt-2">
        {league.members.map((m) => (
          <div
            key={m.userId}
            data-testid={`row-${m.userId}`}
            data-you={m.isYou}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${
              m.isYou ? "bg-ink text-white" : "border border-[#e2e8f0] bg-white"
            }`}
          >
            <span className={`w-5 text-sm font-black ${m.isYou ? "text-neon" : "text-ink"}`}>{m.rank}</span>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black ${
              m.isYou ? "bg-green-600 text-white" : "bg-slate-200 text-slate-600"
            }`}>{m.initials}</span>
            <div className="flex-1">
              <div className={`text-sm font-extrabold ${m.isYou ? "text-white" : "text-slate-900"}`}>{m.name}</div>
              <div className={`text-[10px] ${m.isYou ? "text-neutral-400" : "text-slate-400"}`}>
                {formatAccuracy(m.accuracy)} accuracy · {m.streak}🔥
              </div>
            </div>
            <span className={`text-sm font-black tabular-nums ${m.isYou ? "text-neon" : "text-ink"}`}>
              {formatPoints(m.points)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
