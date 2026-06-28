import Link from "next/link";
import type { Match } from "@/lib/predict/types";
import TeamAvatar from "@/components/predict/TeamAvatar";

function kickoffLabel(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  const t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const dayMs = 86_400_000;
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = d.toDateString() === new Date(now.getTime() + dayMs).toDateString();
  const prefix = sameDay ? "TODAY" : tomorrow ? "TOMORROW" : d.toLocaleDateString([], { weekday: "short" }).toUpperCase();
  return `${prefix} ${t}`;
}

function Action({ match }: { match: Match }) {
  if (match.state === "FT" || match.state === "VOID")
    return <span className="shrink-0 rounded-full bg-[#f1f5f9] px-3 py-1.5 text-xs font-extrabold text-[#16a34a]">Proof</span>;
  if (match.state === "LIVE")
    return <span className="shrink-0 rounded-full bg-neon px-3 py-1.5 text-xs font-black text-ink">Pick ▸</span>;
  return <span className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-extrabold text-neon">Pick ▸</span>;
}

export default function MatchListItem({ match }: { match: Match }) {
  const finished = match.state === "FT";
  const upcoming = match.state === "NOT_STARTED";

  let header: React.ReactNode;
  if (match.state === "LIVE") {
    header = (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-ink">
        <span className="glz-blink h-1.5 w-1.5 rounded-full bg-neon" />LIVE {match.minute}&apos;
      </span>
    );
  } else if (match.state === "HT") {
    header = <span className="text-[10px] font-extrabold tracking-[0.05em] text-amber-500">HALF TIME</span>;
  } else if (finished) {
    header = <span className="text-[10px] font-extrabold tracking-[0.05em] text-slate-500">FULL TIME · ✓ settled</span>;
  } else {
    header = <span className="text-[10px] font-extrabold tracking-[0.05em] tabular-nums text-slate-400">{kickoffLabel(match.kickoffMs)}</span>;
  }

  return (
    <Link
      href={`/match/${match.id}`}
      className={
        "block rounded-2xl border px-3.5 py-3 transition-colors " +
        (finished ? "border-[#eef2f7] bg-[#fbfcfe] hover:border-slate-200" : "border-[#e2e8f0] bg-white shadow-card hover:border-slate-300")
      }
    >
      {header}

      {match.state === "LIVE" ? (
        <div className="mt-2 flex items-center gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><TeamAvatar team={match.home} size={24} /><span className="text-[13px] font-bold text-ink">{match.home.name}</span></div>
              <span className="text-[14px] font-black tabular-nums text-ink">{match.homeScore}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><TeamAvatar team={match.away} size={24} /><span className="text-[13px] font-bold text-ink">{match.away.name}</span></div>
              <span className="text-[14px] font-black tabular-nums text-ink">{match.awayScore}</span>
            </div>
          </div>
          <Action match={match} />
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-[13px] font-bold text-ink">
            <TeamAvatar team={match.home} size={22} />
            <span className="truncate">{match.home.name}</span>
            <span className="tabular-nums font-extrabold text-slate-500">
              {upcoming ? <span className="font-bold text-slate-300">vs</span> : `${match.homeScore}–${match.awayScore}`}
            </span>
            <span className="truncate">{match.away.name}</span>
            <TeamAvatar team={match.away} size={22} />
          </div>
          <Action match={match} />
        </div>
      )}
    </Link>
  );
}
