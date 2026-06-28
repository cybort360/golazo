import type { Match } from "@/lib/predict/types";
import { matchStateLabel } from "@/lib/predict/labels";

// Ink chip with a blinking lime dot for live games (canvas design). Renders
// nothing before kickoff (empty label).
export default function MatchStatePill({ match }: { match: Match }) {
  const label = matchStateLabel(match);
  if (!label) return null;
  const live = match.state === "LIVE";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-[10px] font-extrabold tracking-[0.06em] text-white">
      {live && <span className="glz-blink h-1.5 w-1.5 rounded-full bg-neon" />}
      {label}
    </span>
  );
}
