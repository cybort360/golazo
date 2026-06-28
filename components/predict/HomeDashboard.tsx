import Link from "next/link";
import type { Match, League, ProofReceipt } from "@/lib/predict/types";
import { formatPoints } from "@/lib/predict/labels";
import MatchListItem from "@/components/predict/MatchListItem";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-black uppercase tracking-[0.13em] text-ink">{children}</div>;
}

export default function HomeDashboard({
  liveMatches, leagues, receipts,
}: {
  liveMatches: Match[];
  leagues: League[];
  receipts: ProofReceipt[];
}) {
  const receipt = receipts[0] ?? null;
  const league = leagues[0] ?? null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8 lg:hidden">
      {/* ink hero */}
      <section className="relative overflow-hidden rounded-3xl bg-ink px-6 pb-7 pt-5 text-white">
        <div className="pointer-events-none absolute -bottom-12 -right-7 select-none text-[130px] font-black opacity-[0.06]">⚽</div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="text-[21px] font-black tracking-[-0.04em]">GOLAZO</div>
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] border-[#334155] bg-[#1e293b] text-[13px] font-extrabold text-neon">JK</span>
          </div>
          <h1 className="mt-4 text-[30px] font-black leading-[1.02] tracking-[-0.045em]">
            Make picks. Prove you know ball. <span className="text-neon">⚡</span>
          </h1>
          <div className="mt-3.5 flex gap-2">
            <Link href="/matches" className="rounded-full bg-neon px-4 py-2.5 text-[13px] font-extrabold text-ink">Make a pick</Link>
            <Link href="/leagues" className="rounded-full border border-[#2a2a2a] bg-[#171717] px-4 py-2.5 text-[13px] font-bold text-slate-200">My leagues</Link>
          </div>
        </div>
      </section>

      {/* live now */}
      <section>
        <div className="mb-2.5 flex items-center gap-2">
          <span className="glz-pulse h-2 w-2 rounded-full bg-neon" />
          <SectionLabel>Live now</SectionLabel>
          {liveMatches.length > 0 && (
            <Link href="/matches" className="ml-auto text-[11px] font-bold text-slate-500">See all</Link>
          )}
        </div>
        {liveMatches.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {liveMatches.map((m) => <MatchListItem key={m.id} match={m} />)}
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
          <Link
            href={`/leagues/${league.code}`}
            className="flex items-center justify-between rounded-2xl bg-ink px-4 py-4 text-white"
          >
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
  );
}
