import { kv } from "@vercel/kv";
import type { Player } from "@/lib/predictions";
import { playerKey, resolvePlayerId } from "@/lib/predictionStore";
import { getTeam } from "@/lib/fpl/store";
import { golazoBalance } from "@/lib/golazoBalance";
import { isPotEligible } from "@/lib/predictEligibility";
import { upcomingGameweek, activeGameweek } from "@/lib/fpl/gameweeks";

export const dynamic = "force-dynamic";

const NONE = {
  team: null,
  golazoBalance: null,
  threshold: 0,
  eligible: true,
};

// A manager's team plus pot eligibility (reusing the predict $GOLAZO gate) and
// which gameweek is open for edits. Returns open defaults for an unknown player
// rather than erroring.
export async function GET(request: Request) {
  const now = Date.now();
  const gw = {
    upcoming: upcomingGameweek(now),
    active: activeGameweek(now),
  };

  let id: string | null;
  try {
    id = await resolvePlayerId(request);
  } catch {
    return Response.json({ ...NONE, gw });
  }
  if (!id) return Response.json({ ...NONE, gw });

  try {
    const [team, player, threshold] = await Promise.all([
      getTeam(id),
      kv.get<Player>(playerKey(id)),
      kv.get<number>("pred_min_golazo"),
    ]);

    const min = threshold ?? 0;
    const wallet = player?.wallet ?? null;
    const balance = min > 0 && wallet ? await golazoBalance(wallet) : null;

    return Response.json({
      team,
      golazoBalance: balance,
      threshold: min,
      eligible: isPotEligible(balance, min),
      gw,
    });
  } catch {
    return Response.json({ ...NONE, gw });
  }
}
