import Link from "next/link";
import type { Match, League, ProofReceipt, LeagueMember } from "@/lib/predict/types";
import { formatPoints } from "@/lib/predict/labels";
import MatchCard from "@/components/predict/MatchCard";
import { SoccerBall, Check } from "@phosphor-icons/react/dist/ssr";
import CopyButton from "@/components/predict/CopyButton";
import KickoffCountdown from "@/components/predict/KickoffCountdown";

function RailRow({ member }: { member: LeagueMember }) {
  return (
    <div
      className={
        member.isYou
          ? "flex items-center gap-3 rounded-[13px] bg-ink px-3 py-2.5 shadow-[0_0_0_2px_#d4ff3f]"
          : "flex items-center gap-3 px-3 py-2.5"
      }
    >
      <span className={"w-4 text-[14px] font-black tabular-nums " + (member.isYou ? "text-neon" : "text-ink")}>{member.rank}</span>
      {member.isYou ? (
        <span className="flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-neon bg-[#1e293b] text-[11px] font-extrabold text-neon">{member.initials}</span>
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold text-white" style={{ background: member.color }}>{member.initials}</span>
      )}
      <span className={"flex-1 truncate text-[13px] font-bold " + (member.isYou ? "text-white" : "text-ink")}>
        {member.isYou ? "You" : member.name}
      </span>
      <span className={"text-[14px] font-black tabular-nums " + (member.isYou ? "text-neon" : "text-ink")}>{formatPoints(member.points)}</span>
    </div>
  );
}

export default function HomeDashboardDesktop({
  matches, leagues, receipts,
}: {
  matches: Match[];
  leagues: League[];
  receipts: ProofReceipt[];
}) {
  const live = matches.find((m) => m.state === "LIVE" || m.state === "HT");
  const upcoming = matches.find((m) => m.state === "NOT_STARTED");
  const cards = [live, upcoming].filter((m): m is Match => Boolean(m));
  const league = leagues[0] ?? null;

  return (
    <div className="hidden lg:block">
      {/* hero strip */}
      <div className="relative overflow-hidden bg-ink px-8 py-7 text-white">
        <SoccerBall weight="fill" className="pointer-events-none absolute -bottom-10 right-6 select-none opacity-[0.05]" size={150} />
        <div className="relative flex items-center justify-between gap-6">
          <div>
            <h1 className="text-[34px] font-black leading-[1.02] tracking-[-0.045em]">Make picks. Prove you know ball.</h1>
            <p className="mt-1.5 text-sm font-semibold text-slate-400">Make picks. Compete with friends. Every result verified.</p>
          </div>
          <div className="flex shrink-0 gap-2.5">
            <Link href="/matches" className="rounded-xl bg-neon px-5 py-3 text-sm font-extrabold text-ink">Make a pick</Link>
            <Link href="/leagues" className="rounded-xl border border-[#2a2a2a] bg-[#171717] px-5 py-3 text-sm font-bold text-slate-200">+ New league</Link>
          </div>
        </div>
      </div>

      {/* content grid */}
      <div className="grid grid-cols-[1.6fr_1fr] gap-6 px-8 py-6">
        {/* left */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            {live ? (
              <>
                <span className="glz-pulse h-2 w-2 rounded-full bg-neon" />
                <span className="text-[11px] font-black uppercase tracking-[0.13em] text-ink">Live now</span>
              </>
            ) : upcoming ? (
              <>
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                <span className="text-[11px] font-black uppercase tracking-[0.13em] text-ink">Up next</span>
                <span className="text-slate-300">·</span>
                <KickoffCountdown
                  kickoffMs={upcoming.kickoffMs}
                  className="text-[11px] font-bold tabular-nums text-slate-500"
                />
              </>
            ) : (
              <span className="text-[11px] font-black uppercase tracking-[0.13em] text-ink">Matches</span>
            )}
          </div>
          {cards.length > 0 ? (
            <div className="grid grid-cols-2 gap-3.5">
              {cards.map((m) => <MatchCard key={m.id} match={m} />)}
            </div>
          ) : (
            <Link
              href="/matches"
              className="block rounded-2xl border border-[#e2e8f0] bg-white px-5 py-10 text-center text-sm font-medium text-slate-500 shadow-card"
            >
              No matches scheduled right now. Browse all fixtures ▸
            </Link>
          )}

          <div className="mb-3 mt-6 text-[11px] font-black uppercase tracking-[0.13em] text-ink">Recent proof</div>
          <div className="flex flex-col gap-2.5">
            {receipts.map((r, i) => (
              <Link
                key={r.pickId}
                href={`/r/${r.pickId}`}
                className={
                  "flex items-center gap-3 rounded-[13px] px-4 py-3.5 " +
                  (i === 0 ? "bg-ink" : "border border-[#e2e8f0] bg-white")
                }
              >
                <span className="inline-flex items-center gap-1 rounded-[7px] bg-green-600 px-2 py-1 text-[10px] font-extrabold text-white"><Check weight="bold" size={11} /> {r.result}</span>
                <span className={"flex-1 truncate text-[13px] font-bold " + (i === 0 ? "text-white" : "text-ink")}>
                  {r.predictionLabel} · {r.home.name} {r.homeScore}–{r.awayScore} {r.away.name}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">TxLINE</span>
                <span className={"text-[15px] font-black tabular-nums " + (i === 0 ? "text-neon" : "text-green-600")}>+{formatPoints(r.points)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* right rail */}
        <div>
          <div className="mb-3 text-[11px] font-black uppercase tracking-[0.13em] text-ink">Your leagues</div>
          {league ? (
            <>
              <div className="rounded-2xl bg-ink p-[18px] text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-base font-extrabold">{league.name}</div>
                    <div className="mt-0.5 text-xs font-semibold text-slate-400">{league.memberCount} players</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-neon">Rank</div>
                    <div className="text-[28px] font-black leading-none tracking-[-0.04em] tabular-nums">#{league.yourRank}</div>
                  </div>
                </div>
                <div className="mt-3.5 flex items-center justify-between rounded-[11px] border border-dashed border-[#333] bg-[#171717] px-3.5 py-3">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">Invite</div>
                    <div className="text-[15px] font-black tracking-[0.04em] tabular-nums text-neon">{league.code}</div>
                  </div>
                  <CopyButton value={league.code} label="Share" className="rounded-[9px] bg-neon px-3.5 py-2 text-[12px] font-black text-ink" />
                </div>
              </div>

              <div className="mt-3.5 rounded-2xl border border-[#e2e8f0] bg-white p-2">
                <div className="px-2 py-2 text-[11px] font-semibold text-slate-500">This week</div>
                {league.members.slice(0, 3).map((m) => <RailRow key={m.userId} member={m} />)}
              </div>
            </>
          ) : (
            <Link href="/leagues" className="block rounded-2xl border border-[#e2e8f0] bg-white px-4 py-4 text-sm font-bold text-green-600 shadow-card">
              ＋ Create or join a league
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
