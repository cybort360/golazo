import type { League, LeagueMember } from "@/lib/predict/types";
import { formatPoints, formatAccuracy } from "@/lib/predict/labels";

function Avatar({ member }: { member: LeagueMember }) {
  if (member.isYou) {
    return (
      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] border-neon bg-[#1e293b] text-[12px] font-extrabold text-neon">
        {member.initials}
      </span>
    );
  }
  return (
    <span
      className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-[12px] font-extrabold text-white"
      style={{ background: member.color }}
    >
      {member.initials}
    </span>
  );
}

export default function LeagueLeaderboard({ league }: { league: League }) {
  return (
    <div className="bg-[#f8fafc]">
      {/* ink header */}
      <div className="bg-ink px-5 pb-5 pt-5 text-white">
        <div className="flex items-center justify-between text-[13px] font-bold text-slate-400">
          <span>‹ Leagues</span>
          <span>⚙</span>
        </div>
        <div className="mt-3.5 flex items-end justify-between">
          <div>
            <div className="text-2xl font-black tracking-[-0.03em]">{league.name}</div>
            <div className="mt-0.5 text-xs font-semibold text-slate-400">{league.memberCount} players · season 2</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-neon">Your rank</div>
            <div className="text-[30px] font-black leading-none tracking-[-0.04em] tabular-nums">#{league.yourRank}</div>
          </div>
        </div>
        {/* invite hook */}
        <div className="mt-4 flex items-center justify-between rounded-[14px] border border-dashed border-[#333] bg-[#171717] px-3.5 py-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Invite code</div>
            <div className="text-[19px] font-black tracking-[0.04em] tabular-nums text-neon">{league.code}</div>
          </div>
          <button type="button" className="rounded-[11px] bg-neon px-4 py-2.5 text-[13px] font-black text-ink">
            Share invite
          </button>
        </div>
      </div>

      {/* toggle */}
      <div className="px-4 pb-1 pt-3.5">
        <div className="flex rounded-xl bg-[#e9eef4] p-1">
          <button type="button" className="flex-1 rounded-[9px] bg-white py-2 text-center text-[13px] font-extrabold text-ink shadow-card">
            This week
          </button>
          <button type="button" className="flex-1 py-2 text-center text-[13px] font-bold text-slate-500">
            All time
          </button>
        </div>
      </div>

      {/* rows */}
      <div className="px-4 pb-5 pt-1.5">
        {league.members.map((m) => (
          <div
            key={m.userId}
            data-testid={`row-${m.userId}`}
            data-you={m.isYou}
            className={
              m.isYou
                ? "my-1 flex items-center gap-3 rounded-[14px] bg-ink px-3 py-3 shadow-[0_0_0_2px_#d4ff3f]"
                : "flex items-center gap-3 rounded-[13px] px-3 py-2.5"
            }
          >
            <span className={"w-5 text-[15px] font-black tabular-nums " + (m.isYou ? "text-neon" : "text-ink")}>{m.rank}</span>
            <Avatar member={m} />
            <div className="min-w-0 flex-1">
              <div className={"truncate text-sm font-extrabold " + (m.isYou ? "text-white" : "text-ink")}>{m.name}</div>
              <div className={"text-[11px] font-semibold " + (m.isYou ? "text-slate-400" : "text-slate-500")}>
                {formatAccuracy(m.accuracy)} acc · 🔥 {m.streak}
              </div>
            </div>
            <span className={"text-[15px] font-black tabular-nums " + (m.isYou ? "text-neon" : "text-ink")}>
              {formatPoints(m.points)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
