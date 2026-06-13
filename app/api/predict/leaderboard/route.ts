import { getCachedLeaderboards, currentWeekKeyEt } from "@/lib/predictionStore";
import type { LeaderRow } from "@/lib/predictions";

export const dynamic = "force-dynamic";

const TOP_N = 100;

/** Public rows: truncate the wallet so the board doesn't fully dox players. */
function publicRow(r: LeaderRow) {
  const w = r.wallet;
  return {
    nickname: r.nickname,
    wallet: w.length > 8 ? `${w.slice(0, 4)}…${w.slice(-4)}` : w,
    points: r.points,
    correct: r.correct,
    played: r.played,
  };
}

export async function GET() {
  const lb = await getCachedLeaderboards();
  const currentWeek = currentWeekKeyEt();
  return Response.json({
    currentWeek,
    season: lb.season.slice(0, TOP_N).map(publicRow),
    week: (lb.weeks[currentWeek] ?? []).slice(0, TOP_N).map(publicRow),
  });
}
