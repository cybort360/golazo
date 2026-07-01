import Link from "next/link";
import type { ActivePickGroup } from "@/lib/predict/types";
import TeamAvatar from "@/components/predict/TeamAvatar";
import KickoffCountdown from "@/components/predict/KickoffCountdown";
import { ListChecks, CaretRight, SoccerBall } from "@phosphor-icons/react/dist/ssr";

function StateHeader({ match }: { match: ActivePickGroup["match"] }) {
  if (match.state === "LIVE")
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-ink">
        <span className="glz-blink h-1.5 w-1.5 rounded-full bg-neon" />LIVE {match.minute}&apos;
      </span>
    );
  if (match.state === "HT")
    return <span className="text-[10px] font-extrabold tracking-[0.05em] text-amber-500">HALF TIME</span>;
  if (match.state === "FT" || match.state === "VOID")
    return <span className="text-[10px] font-extrabold tracking-[0.05em] text-slate-500">AWAITING RESULT</span>;
  return (
    <KickoffCountdown
      kickoffMs={match.kickoffMs}
      className="text-[10px] font-extrabold tracking-[0.05em] tabular-nums text-slate-400"
    />
  );
}

function GroupCard({ group }: { group: ActivePickGroup }) {
  const { match, picks } = group;
  const live = match.state === "LIVE" || match.state === "HT";
  return (
    <Link
      href={`/match/${match.id}`}
      className="block rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3.5 shadow-card transition-colors hover:border-slate-300"
    >
      <div className="flex items-center justify-between">
        <StateHeader match={match} />
        <CaretRight weight="bold" size={13} className="text-slate-300" />
      </div>

      <div className="mt-2 flex items-center gap-2 text-[14px] font-bold text-ink">
        <TeamAvatar team={match.home} size={22} />
        <span className="truncate">{match.home.name}</span>
        <span className="tabular-nums font-extrabold text-slate-500">
          {live ? `${match.homeScore ?? 0}–${match.awayScore ?? 0}` : <span className="font-bold text-slate-300">vs</span>}
        </span>
        <span className="truncate">{match.away.name}</span>
        <TeamAvatar team={match.away} size={22} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {picks.map((p) => (
          <span
            key={p.pickId}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
          >
            {p.marketTitle}
            <span className="font-extrabold text-ink">{p.optionLabel}</span>
          </span>
        ))}
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <ListChecks size={24} />
      </div>
      <p className="mt-3 text-sm font-extrabold text-ink">No active picks yet</p>
      <p className="mt-1 text-xs font-semibold text-slate-400">Picks you lock in show up here until they settle.</p>
      <Link
        href="/matches"
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-extrabold text-neon"
      >
        <SoccerBall size={14} weight="fill" /> Make your first pick
      </Link>
    </div>
  );
}

export default function MyPicks({ groups }: { groups: ActivePickGroup[] }) {
  const pickCount = groups.reduce((s, g) => s + g.picks.length, 0);

  return (
    <div className="mx-auto max-w-2xl lg:max-w-4xl">
      {/* ink banner */}
      <div className="relative overflow-hidden bg-ink px-4 py-6 text-white lg:px-8 lg:py-7">
        <ListChecks weight="fill" className="pointer-events-none absolute -bottom-8 right-4 select-none opacity-[0.06]" size={140} />
        <div className="relative flex items-end justify-between gap-6">
          <div>
            <h1 className="text-[24px] font-black tracking-[-0.04em] lg:text-[30px]">My picks</h1>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              Your active picks, waiting on verified results.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Active</div>
            <div className="text-[26px] font-black leading-none tracking-[-0.03em] tabular-nums text-neon">{pickCount}</div>
          </div>
        </div>
      </div>

      {/* list */}
      <div className="px-4 py-5 lg:px-8 lg:py-7">
        {groups.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((g) => (
              <GroupCard key={g.match.id} group={g} />
            ))}
          </div>
        )}
        {groups.length > 0 && (
          <p className="mt-5 text-center text-xs font-semibold text-slate-400">
            Settled picks move to{" "}
            <Link href="/receipts" className="font-extrabold text-ink underline underline-offset-2">
              Receipts
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
