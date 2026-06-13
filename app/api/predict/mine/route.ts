import { kv } from "@vercel/kv";
import type { Player } from "@/lib/predictions";
import { tokenKey, playerKey, picksKey } from "@/lib/predictionStore";
import { golazoBalance } from "@/lib/golazoBalance";
import { isPotEligible } from "@/lib/predictEligibility";

export const dynamic = "force-dynamic";

const NONE = { player: null, picks: {}, golazoBalance: null, threshold: 0, eligible: true };

// Re-hydrate a player's registration + saved picks from their token (kept in
// localStorage), plus their live pot eligibility (current $GOLAZO balance vs the
// threshold) so the page can show a personal "you're in / hold X more" line.
// Returns the open defaults rather than erroring on an unknown token.
export async function GET(request: Request) {
  // Token comes in the Authorization header (not the URL) so it can't leak via
  // server/proxy logs, browser history, or Referer.
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json(NONE);

  try {
    const wallet = await kv.get<string>(tokenKey(token));
    if (!wallet) return Response.json(NONE);

    const [player, picks, threshold] = await Promise.all([
      kv.get<Player>(playerKey(wallet)),
      kv.get<Record<string, string>>(picksKey(wallet)),
      kv.get<number>("pred_min_golazo"),
    ]);
    const min = threshold ?? 0;
    // Only spend an RPC read when there's actually a gate to check.
    const balance = min > 0 ? await golazoBalance(wallet) : null;

    return Response.json({
      player: player ?? null,
      picks: picks ?? {},
      golazoBalance: balance,
      threshold: min,
      eligible: isPotEligible(balance, min),
    });
  } catch {
    return Response.json(NONE);
  }
}
