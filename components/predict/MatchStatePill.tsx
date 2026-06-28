import type { Match } from "@/lib/predict/types";
import { matchStateLabel } from "@/lib/predict/labels";

export default function MatchStatePill({ match }: { match: Match }) {
  const label = matchStateLabel(match);
  if (!label) return null;
  const live = match.state === "LIVE";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-green-700">
      {live && <span className="h-1.5 w-1.5 rounded-full bg-neon ring-2 ring-green-500/40" />}
      {label}
    </span>
  );
}
