import Link from "next/link";
import type { Match } from "@/lib/predict/types";
import { scoreLabel } from "@/lib/predict/labels";
import MatchStatePill from "@/components/predict/MatchStatePill";

export default function MatchListItem({ match }: { match: Match }) {
  const score = scoreLabel(match);
  const upcoming = match.state === "NOT_STARTED";
  return (
    <Link
      href={`/match/${match.id}`}
      className="flex items-center justify-between gap-3 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3 shadow-card hover:border-slate-300"
    >
      <div className="min-w-0">
        <div className="text-sm font-extrabold text-slate-900">
          {match.home.ticker} <span className="text-slate-300">vs</span> {match.away.ticker}
        </div>
        <div className="mt-0.5 text-xs text-slate-400">
          {upcoming ? (
            <time suppressHydrationWarning>
              {new Date(match.kickoffMs).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}
            </time>
          ) : (
            <span className="inline-flex items-center gap-2">
              <MatchStatePill match={match} />
              {score && <span className="font-bold text-slate-600">{score}</span>}
            </span>
          )}
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-neon px-3 py-1.5 text-xs font-black text-ink">Pick ▸</span>
    </Link>
  );
}
