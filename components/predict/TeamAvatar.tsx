import type { MatchTeam } from "@/lib/predict/types";

// Colored circle showing a team's 3-letter code (canvas design). Size in px.
export default function TeamAvatar({
  team,
  size = 30,
}: {
  team: MatchTeam;
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white"
      style={{
        width: size,
        height: size,
        background: team.color,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {team.ticker}
    </span>
  );
}
