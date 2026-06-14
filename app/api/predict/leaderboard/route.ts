import { kv } from "@vercel/kv";
import { getCachedLeaderboards, currentGameweekKey } from "@/lib/predictionStore";
import { gameweekById, GAMEWEEKS } from "@/lib/fpl/gameweeks";
import type { LeaderRow } from "@/lib/predictions";

export const dynamic = "force-dynamic";

const TOP_N = 100;

/** Public rows: truncate the wallet so the board doesn't fully dox players;
 *  Telegram players have no wallet, so show nothing there. */
function publicRow(r: LeaderRow) {
  const w = r.wallet;
  return {
    nickname: r.nickname,
    wallet: w ? (w.length > 8 ? `${w.slice(0, 4)}…${w.slice(-4)}` : w) : "",
    points: r.points,
    correct: r.correct,
    played: r.played,
  };
}

export async function GET() {
  const lb = await getCachedLeaderboards();
  const currentWeek = currentGameweekKey();
  const currentWeekLabel = gameweekById(currentWeek)?.label ?? null;
  let minGolazo = 0;
  try {
    minGolazo = (await kv.get<number>("pred_min_golazo")) ?? 0;
  } catch {
    minGolazo = 0;
  }
  // Every matchweek up to and including the current one, so past boards stay
  // viewable after they roll over.
  const currentIdx = GAMEWEEKS.findIndex((g) => g.id === currentWeek);
  const matchweeks = (currentIdx >= 0 ? GAMEWEEKS.slice(0, currentIdx + 1) : []).map(
    (g) => ({
      id: g.id,
      label: g.label,
      rows: (lb.weeks[g.id] ?? []).slice(0, TOP_N).map(publicRow),
    }),
  );

  return Response.json({
    currentWeek,
    currentWeekLabel,
    minGolazo,
    season: lb.season.slice(0, TOP_N).map(publicRow),
    week: (lb.weeks[currentWeek] ?? []).slice(0, TOP_N).map(publicRow),
    matchweeks,
  });
}
