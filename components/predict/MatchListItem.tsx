import Link from "next/link";
import type { Match } from "@/lib/predict/types";
import { scoreLabel } from "@/lib/predict/labels";
import TeamAvatar from "@/components/predict/TeamAvatar";

function kickoffLabel(ms: number): string {
  return new Date(ms)
    .toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })
    .toUpperCase();
}

export default function MatchListItem({ match }: { match: Match }) {
  const finished = match.state === "FT";
  const upcoming = match.state === "NOT_STARTED";
  const score = scoreLabel(match);

  let header: React.ReactNode;
  if (match.state === "LIVE") {
    header = (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-ink">
        <span className="glz-blink h-1.5 w-1.5 rounded-full bg-neon" />
        LIVE {match.minute}&apos;
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
        (finished
          ? "border-[#eef2f7] bg-[#fbfcfe] opacity-90 hover:border-slate-200"
          : "border-[#e2e8f0] bg-white shadow-card hover:border-slate-300")
      }
    >
      {header}
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[13px] font-bold text-ink">
          <TeamAvatar team={match.home} size={22} />
          <span className="truncate">{match.home.name}</span>
          <span className="tabular-nums font-extrabold text-slate-500">
            {upcoming ? <span className="font-bold text-slate-300">vs</span> : (score || "")}
          </span>
          <span className="truncate">{match.away.name}</span>
          <TeamAvatar team={match.away} size={22} />
        </div>
        {finished ? (
          <span className="shrink-0 rounded-full bg-[#f1f5f9] px-3 py-1.5 text-xs font-extrabold text-[#16a34a]">Proof</span>
        ) : match.state === "LIVE" ? (
          <span className="shrink-0 rounded-full bg-neon px-3 py-1.5 text-xs font-black text-ink">Pick ▸</span>
        ) : (
          <span className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-extrabold text-neon">Pick ▸</span>
        )}
      </div>
    </Link>
  );
}
