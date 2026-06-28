import type { GlobalLeaderboard as GlobalLeaderboardData, LeagueMember } from "@/lib/predict/types";
import { formatPoints, formatAccuracy } from "@/lib/predict/labels";

function Row({ member }: { member: LeagueMember }) {
  const you = member.isYou;
  const medal = member.rank <= 3 ? ["🥇", "🥈", "🥉"][member.rank - 1] : null;
  return (
    <div
      data-testid={`grow-${member.userId}`}
      data-you={you}
      className={
        you
          ? "flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-[0_0_0_2px_#d4ff3f]"
          : "flex items-center gap-4 border-b border-[#eef2f7] px-5 py-4 last:border-0"
      }
    >
      <span className={"w-7 text-center text-[15px] font-black tabular-nums " + (you ? "text-neon" : "text-ink")}>
        {medal ?? member.rank}
      </span>
      {you ? (
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] border-neon bg-[#1e293b] text-[12px] font-extrabold text-neon">{member.initials}</span>
      ) : (
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: member.color }}>{member.initials}</span>
      )}
      <span className="flex-1 truncate text-[15px] font-extrabold text-ink">{member.name}</span>
      <span className="w-24 text-right text-[14px] font-bold tabular-nums text-slate-600">{formatAccuracy(member.accuracy)}</span>
      <span className="w-20 text-right text-[14px] font-bold tabular-nums text-slate-600">🔥{member.streak}</span>
      <span className="w-24 text-right text-[15px] font-black tabular-nums text-ink">{formatPoints(member.points)}</span>
    </div>
  );
}

export default function GlobalLeaderboardDesktop({ board }: { board: GlobalLeaderboardData }) {
  const youInTop = board.top.some((m) => m.isYou);
  return (
    <div className="hidden lg:block">
      {/* ink banner */}
      <div className="bg-ink px-8 py-7 text-white">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Public ranking</div>
            <div className="mt-1 text-[28px] font-black tracking-[-0.03em]">Global leaderboard 🌍</div>
            <div className="mt-1 text-[13px] font-semibold text-slate-400">
              {formatPoints(board.totalPlayers)} players worldwide · this week
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Your rank</div>
            <div className="text-[34px] font-black leading-none tracking-[-0.04em] tabular-nums">#{board.you.rank}</div>
          </div>
        </div>
      </div>

      {/* toggle + column headers */}
      <div className="flex items-center justify-between px-8 pb-2 pt-6">
        <div className="flex rounded-xl bg-[#e9eef4] p-1">
          <button type="button" className="rounded-[9px] bg-white px-5 py-2 text-[13px] font-extrabold text-ink shadow-card">This week</button>
          <button type="button" className="px-5 py-2 text-[13px] font-bold text-slate-500">All time</button>
        </div>
        <div className="flex items-center text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
          <span className="w-24 text-right">Accuracy</span>
          <span className="w-20 text-right">Streak</span>
          <span className="w-24 text-right">Points</span>
        </div>
      </div>

      {/* rows */}
      <div className="px-8 pb-8">
        <div className="rounded-2xl">
          {board.top.map((m) => <Row key={m.userId} member={m} />)}
        </div>
        {!youInTop && (
          <div className="mt-4">
            <div className="mb-2 ml-1 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Your standing</div>
            <Row member={board.you} />
          </div>
        )}
      </div>
    </div>
  );
}
