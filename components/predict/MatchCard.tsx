import Link from "next/link";
import type { Match } from "@/lib/predict/types";
import TeamAvatar from "@/components/predict/TeamAvatar";

function kickoffLabel(ms: number): string {
  return new Date(ms)
    .toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })
    .toUpperCase();
}

// Rich desktop match card. Used in the Home "Live now" grid and the Matches page.
export default function MatchCard({ match }: { match: Match }) {
  const live = match.state === "LIVE";
  const ht = match.state === "HT";
  const ns = match.state === "NOT_STARTED";
  const ft = match.state === "FT";
  const score = `${match.homeScore}–${match.awayScore}`;

  let header: React.ReactNode;
  if (live) {
    header = (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-[10px] font-extrabold text-white">
        <span className="glz-blink h-1.5 w-1.5 rounded-full bg-neon" />
        LIVE {match.minute}&apos;
      </span>
    );
  } else if (ht) {
    header = <span className="text-[10px] font-extrabold uppercase tracking-[0.05em] text-amber-500">Half time</span>;
  } else if (ft) {
    header = <span className="text-[10px] font-extrabold uppercase tracking-[0.05em] text-slate-500">Full time · ✓ settled</span>;
  } else {
    header = <span className="text-[10px] font-extrabold uppercase tracking-[0.05em] tabular-nums text-slate-400">{kickoffLabel(match.kickoffMs)}</span>;
  }

  return (
    <Link
      href={`/match/${match.id}`}
      className={
        "block rounded-2xl border p-4 transition-colors " +
        (ft ? "border-[#eef2f7] bg-[#fbfcfe] hover:border-slate-200" : "border-[#e2e8f0] bg-white shadow-card hover:border-slate-300")
      }
    >
      <div className="flex items-center justify-between">
        {header}
        <span className="text-[10px] font-semibold text-slate-400">{match.competition} · {match.round}</span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="w-[84px] text-center">
          <TeamAvatar team={match.home} size={40} />
          <div className="mt-1.5 truncate text-[12px] font-bold text-ink">{match.home.name}</div>
        </div>
        <div className={"font-black tabular-nums tracking-[-0.03em] " + (ns ? "text-[15px] text-slate-400" : ft ? "text-[22px] text-ink" : "text-[26px] text-ink")}>
          {ns ? "vs" : score}
        </div>
        <div className="w-[84px] text-center">
          <TeamAvatar team={match.away} size={40} />
          <div className="mt-1.5 truncate text-[12px] font-bold text-ink">{match.away.name}</div>
        </div>
      </div>

      {!ft && (
        <div className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
          Winner · O/U · BTTS · <span className="text-ink">Chaos ⚡</span>
        </div>
      )}

      <div
        className={
          "mt-3.5 rounded-[11px] py-2.5 text-center text-[13px] font-extrabold " +
          (ft
            ? "bg-[#f1f5f9] text-[#16a34a]"
            : live
              ? "bg-neon text-ink"
              : "bg-ink text-neon")
        }
      >
        {ft ? "View result ▸" : "Pick ▸"}
      </div>
    </Link>
  );
}
