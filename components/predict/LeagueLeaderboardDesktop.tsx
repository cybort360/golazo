import type { League, LeagueMember } from "@/lib/predict/types";
import { formatPoints, formatAccuracy } from "@/lib/predict/labels";
import { Flame } from "@phosphor-icons/react/dist/ssr";
import CopyButton from "@/components/predict/CopyButton";
import SegTabs from "@/components/predict/SegTabs";
import PlayerLink from "@/components/predict/PlayerLink";

function Row({ member, index }: { member: LeagueMember; index: number }) {
  const you = member.isYou;
  return (
    <div
      className={
        you
          ? "flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-[0_0_0_2px_#d4ff3f]"
          : "flex items-center gap-4 border-b border-[#eef2f7] px-5 py-4 last:border-0"
      }
    >
      <span className={"w-5 text-[15px] font-black tabular-nums " + (you ? "text-neon" : index >= 4 ? "text-slate-400" : "text-ink")}>
        {member.rank}
      </span>
      {you ? (
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] border-neon bg-[#1e293b] text-[12px] font-extrabold text-neon">{member.initials}</span>
      ) : (
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: member.color }}>{member.initials}</span>
      )}
      <span className="flex-1 truncate text-[15px] font-extrabold text-ink"><PlayerLink handle={member.handle}>{member.name}</PlayerLink></span>
      <span className="w-24 text-right text-[14px] font-bold tabular-nums text-slate-600">{formatAccuracy(member.accuracy)}</span>
      <span className="flex w-20 items-center justify-end gap-1 text-[14px] font-bold tabular-nums text-slate-600"><Flame weight="fill" size={13} className="text-orange-500" />{member.streak}</span>
      <span className="w-20 text-right text-[15px] font-black tabular-nums text-ink">{formatPoints(member.points)}</span>
    </div>
  );
}

export default function LeagueLeaderboardDesktop({ league }: { league: League }) {
  return (
    <div className="hidden lg:block">
      {/* ink banner */}
      <div className="bg-ink px-8 py-7 text-white">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Private league</div>
            <div className="mt-1 text-[28px] font-black tracking-[-0.03em]">{league.name}</div>
            <div className="mt-1 text-[13px] font-semibold text-slate-400">{league.memberCount} players · season 2 · week 31</div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Your rank</div>
              <div className="text-[34px] font-black leading-none tracking-[-0.04em] tabular-nums">#{league.yourRank}</div>
            </div>
            <div className="rounded-[13px] border border-dashed border-[#333] bg-[#171717] px-4 py-3">
              <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">Invite code</div>
              <div className="text-[18px] font-black tracking-[0.04em] tabular-nums text-neon">{league.code}</div>
              <CopyButton value={league.code} label="Share invite ▸" className="mt-1.5 w-full rounded-[9px] bg-neon py-1.5 text-center text-[12px] font-black text-ink" />
            </div>
          </div>
        </div>
      </div>

      {/* toggle + column headers */}
      <div className="flex items-center justify-between px-8 pb-2 pt-6">
        <SegTabs tabs={["This week", "All time"]} />
        {/* gap-4 + pr-5 mirror the row's `gap-4 px-5`, so these labels sit
            directly above their column values. */}
        <div className="flex items-center gap-4 pr-5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
          <span className="w-24 text-right">Accuracy</span>
          <span className="w-20 text-right">Streak</span>
          <span className="w-20 text-right">Points</span>
        </div>
      </div>

      {/* rows */}
      <div className="px-8 pb-8">
        <div className="rounded-2xl">
          {league.members.map((m, i) => <Row key={m.userId} member={m} index={i} />)}
        </div>
      </div>
    </div>
  );
}
