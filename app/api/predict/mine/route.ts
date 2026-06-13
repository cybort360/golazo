import { kv } from "@vercel/kv";
import type { Player } from "@/lib/predictions";
import { playerKey, picksKey, resolvePlayerId } from "@/lib/predictionStore";
import { golazoBalance } from "@/lib/golazoBalance";
import { isPotEligible } from "@/lib/predictEligibility";

export const dynamic = "force-dynamic";

const NONE = { player: null, picks: {}, golazoBalance: null, threshold: 0, eligible: true };

// Re-hydrate a player's registration + saved picks, plus live pot eligibility,
// for whoever is making the request (web token or Telegram initData). Returns
// the open defaults rather than erroring on an unknown/expired identity.
export async function GET(request: Request) {
  let id: string | null;
  try {
    id = await resolvePlayerId(request);
  } catch {
    return Response.json(NONE);
  }
  if (!id) return Response.json(NONE);

  try {
    const [player, picks, threshold] = await Promise.all([
      kv.get<Player>(playerKey(id)),
      kv.get<Record<string, string>>(picksKey(id)),
      kv.get<number>("pred_min_golazo"),
    ]);
    if (!player) return Response.json(NONE);

    const min = threshold ?? 0;
    // Only read on-chain when gated AND the player has a wallet to check.
    const balance =
      min > 0 && player.wallet ? await golazoBalance(player.wallet) : null;

    return Response.json({
      player,
      picks: picks ?? {},
      golazoBalance: balance,
      threshold: min,
      eligible: isPotEligible(balance, min),
    });
  } catch {
    return Response.json(NONE);
  }
}
