import Link from "next/link";
import type { Match, League, ProofReceipt } from "@/lib/predict/types";
import { formatPoints } from "@/lib/predict/labels";
import TeamAvatar from "@/components/predict/TeamAvatar";
import MeAvatar from "@/components/predict/MeAvatar";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-black uppercase tracking-[0.13em] text-ink">{children}</div>;
}

function kickoffTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, "");
}

function LiveCard({ match }: { match: Match }) {
  return (
    <div className="rounded-2xl border border-[#e2e8f0] bg-white p-3.5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-[10px] font-extrabold text-white">
          <span className="glz-blink h-1.5 w-1.5 rounded-full bg-neon" />LIVE {match.minute}&apos;
        </span>
        <span className="text-[11px] font-semibold text-slate-400">{match.competition} · {match.round}</span>
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex flex-1 items-center gap-2.5">
          <TeamAvatar team={match.home} size={30} />
          <span className="text-[14px] font-bold text-ink">{match.home.name}</span>
        </div>
        <div className="px-2 text-[22px] font-black tabular-nums tracking-[-0.03em] text-ink">{match.homeScore}<span className="text-slate-300">–</span>{match.awayScore}</div>
        <div className="flex flex-1 items-center justify-end gap-2.5">
          <span className="text-[14px] font-bold text-ink">{match.away.name}</span>
          <TeamAvatar team={match.away} size={30} />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Link href={`/match/${match.id}`} className="flex-1 rounded-[11px] bg-neon py-2.5 text-center text-[13px] font-extrabold text-ink">Pick ▸</Link>
        <span className="rounded-[11px] bg-[#f1f5f9] px-4 py-2.5 text-[13px] font-bold text-slate-600">Watch</span>
      </div>
    </div>
  );
}

function NextRow({ match }: { match: Match }) {
  return (
    <Link href={`/match/${match.id}`} className="flex items-center justify-between rounded-2xl border border-[#e2e8f0] bg-white px-3.5 py-3 shadow-card">
      <div className="flex items-center gap-2.5">
        <TeamAvatar team={match.home} size={28} />
        <span className="text-[13px] font-semibold text-slate-400">vs</span>
        <TeamAvatar team={match.away} size={28} />
        <span className="ml-1 text-[12px] font-extrabold tabular-nums text-slate-500">Kicks off {kickoffTime(match.kickoffMs)}</span>
      </div>
      <span className="rounded-full bg-ink px-3 py-1.5 text-[12px] font-extrabold text-neon">Pick ▸</span>
    </Link>
  );
}

export default function HomeDashboard({
  matches, leagues, receipts,
}: {
  matches: Match[];
  leagues: League[];
  receipts: ProofReceipt[];
}) {
  const live = matches.find((m) => m.state === "LIVE");
  const next = matches.find((m) => m.state === "NOT_STARTED");
  const receipt = receipts[0] ?? null;
  const league = leagues[0] ?? null;

  return (
    <div className="lg:hidden">
      {/* ink hero — full bleed to the top + edges */}
      <section className="relative overflow-hidden bg-ink px-5 pb-8 pt-7 text-white">
        <div className="pointer-events-none absolute -bottom-10 -right-8 select-none text-[150px] font-black opacity-[0.06]">⚽</div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="text-[22px] font-black tracking-[-0.04em]">GOLAZO</div>
            <MeAvatar className="flex h-[36px] w-[36px] items-center justify-center rounded-full border-[1.5px] border-[#334155] bg-[#1e293b] text-[13px] font-extrabold text-neon" />
          </div>
          <h1 className="mt-5 text-[40px] font-black leading-[1.0] tracking-[-0.045em]">
            Make picks.<br />Prove you<br />know ball. ⚡
          </h1>
          <div className="mt-6 flex gap-2.5">
            <Link href="/matches" className="rounded-full bg-neon px-5 py-3 text-[14px] font-extrabold text-ink">Make a pick</Link>
            <Link href="/leagues" className="rounded-full border border-[#2a2a2a] bg-[#171717] px-5 py-3 text-[14px] font-bold text-slate-200">My leagues</Link>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6 px-4 py-6">
      {/* live now */}
      <section>
        <div className="mb-2.5 flex items-center gap-2">
          <span className="glz-pulse h-2 w-2 rounded-full bg-neon" />
          <SectionLabel>Live now</SectionLabel>
          <Link href="/matches" className="ml-auto text-[11px] font-bold text-slate-500">See all</Link>
        </div>
        {live || next ? (
          <div className="flex flex-col gap-2.5">
            {live && <LiveCard match={live} />}
            {next && <NextRow match={next} />}
          </div>
        ) : (
          <Link href="/matches" className="block rounded-2xl border border-[#e2e8f0] bg-white px-4 py-4 text-sm font-medium text-slate-500 shadow-card">
            No live matches right now — browse all fixtures ▸
          </Link>
        )}
      </section>

      {/* your leagues */}
      <section>
        <div className="mb-2.5"><SectionLabel>Your leagues</SectionLabel></div>
        {league ? (
          <Link href={`/leagues/${league.code}`} className="flex items-center justify-between rounded-2xl bg-ink px-4 py-4 text-white">
            <div>
              <div className="text-[15px] font-extrabold">{league.name}</div>
              <div className="mt-0.5 text-xs font-semibold text-slate-400">{league.memberCount} players · this week</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-neon">Rank</div>
              <div className="text-[26px] font-black leading-none tracking-[-0.04em] tabular-nums">#{league.yourRank}</div>
            </div>
          </Link>
        ) : (
          <Link href="/leagues" className="block rounded-2xl border border-[#e2e8f0] bg-white px-4 py-4 text-sm font-bold text-green-600 shadow-card">
            ＋ Create or join a league
          </Link>
        )}
      </section>

      {/* recent proof */}
      <section>
        <div className="mb-2.5"><SectionLabel>Recent proof</SectionLabel></div>
        {receipt ? (
          <Link href={`/r/${receipt.pickId}`} className="flex items-center gap-3 rounded-[14px] bg-ink px-3.5 py-3">
            <span className="rounded-[7px] bg-green-600 px-2 py-1 text-[10px] font-extrabold text-white">✓ {receipt.result}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold text-white">
                {receipt.predictionLabel} · {receipt.home.name} {receipt.homeScore}–{receipt.awayScore}
              </div>
              <div className="text-[11px] font-semibold text-slate-500">Verified by TxLINE</div>
            </div>
            <span className="text-[15px] font-black tabular-nums text-neon">+{formatPoints(receipt.points)}</span>
          </Link>
        ) : (
          <p className="text-sm text-slate-500">Make a pick to earn your first verified receipt</p>
        )}
      </section>
      </div>
    </div>
  );
}
