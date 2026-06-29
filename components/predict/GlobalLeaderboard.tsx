import type { GlobalLeaderboard as GlobalLeaderboardData, LeagueMember } from "@/lib/predict/types";
import { formatPoints, formatAccuracy } from "@/lib/predict/labels";
import { Medal, Flame, Globe } from "@phosphor-icons/react/dist/ssr";
import SegTabs from "@/components/predict/SegTabs";
import PlayerLink from "@/components/predict/PlayerLink";

const MEDAL_COLORS = ["#f5b301", "#cbd5e1", "#cd7f32"]; // gold / silver / bronze

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

function Row({ member }: { member: LeagueMember }) {
  const medal = member.rank <= 3 ? <Medal weight="fill" size={18} color={MEDAL_COLORS[member.rank - 1]} /> : null;
  return (
    <div
      data-testid={`grow-${member.userId}`}
      data-you={member.isYou}
      className={
        member.isYou
          ? "my-1 flex items-center gap-3 rounded-[14px] bg-ink px-3 py-3 shadow-[0_0_0_2px_#d4ff3f]"
          : "flex items-center gap-3 rounded-[13px] px-3 py-2.5"
      }
    >
      <span className={"flex w-6 items-center justify-center text-[15px] font-black tabular-nums " + (member.isYou ? "text-neon" : "text-ink")}>
        {medal ?? member.rank}
      </span>
      <Avatar member={member} />
      <div className="min-w-0 flex-1">
        <div className={"truncate text-sm font-extrabold " + (member.isYou ? "text-white" : "text-ink")}><PlayerLink handle={member.handle}>{member.name}</PlayerLink></div>
        <div className={"text-[11px] font-semibold " + (member.isYou ? "text-slate-400" : "text-slate-500")}>
          <span className="inline-flex items-center gap-1">{formatAccuracy(member.accuracy)} acc · <Flame weight="fill" size={11} className="text-orange-500" /> {member.streak}</span>
        </div>
      </div>
      <span className={"text-[15px] font-black tabular-nums " + (member.isYou ? "text-neon" : "text-ink")}>
        {formatPoints(member.points)}
      </span>
    </div>
  );
}

export default function GlobalLeaderboard({ board }: { board: GlobalLeaderboardData }) {
  const youInTop = board.top.some((m) => m.isYou);
  return (
    <div className="bg-[#f8fafc] lg:hidden">
      {/* ink header — full bleed to the top + edges */}
      <div className="bg-ink px-5 pb-5 pt-5 text-white">
        <div className="flex items-center justify-between text-[13px] font-bold text-slate-400">
          <span>‹ Leagues</span>
          <Globe weight="fill" size={16} />
        </div>
        <div className="mt-3.5 flex items-end justify-between">
          <div>
            <div className="text-2xl font-black tracking-[-0.03em]">Global leaderboard</div>
            <div className="mt-0.5 text-xs font-semibold text-slate-400">
              {formatPoints(board.totalPlayers)} players worldwide
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-neon">Your rank</div>
            <div className="text-[30px] font-black leading-none tracking-[-0.04em] tabular-nums">#{board.you.rank}</div>
          </div>
        </div>
      </div>

      {/* toggle */}
      <div className="px-4 pb-1 pt-3.5">
        <SegTabs tabs={["This week", "All time"]} block />
      </div>

      {/* top rows */}
      <div className="px-4 pb-2 pt-1.5">
        {board.top.map((m) => <Row key={m.userId} member={m} />)}
      </div>

      {/* pinned "you" row when outside the top */}
      {!youInTop && (
        <div className="px-4 pb-5 pt-1">
          <div className="mb-1.5 ml-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Your standing</div>
          <Row member={board.you} />
        </div>
      )}
    </div>
  );
}
