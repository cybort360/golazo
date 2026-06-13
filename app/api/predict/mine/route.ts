import { kv } from "@vercel/kv";
import type { Player } from "@/lib/predictions";
import { tokenKey, playerKey, picksKey } from "@/lib/predictionStore";

export const dynamic = "force-dynamic";

// Re-hydrate a player's registration + saved picks from their token (kept in
// localStorage). Lets a returning device confirm registration and show its
// existing picks. Returns nulls rather than erroring on an unknown token.
export async function GET(request: Request) {
  // Token comes in the Authorization header (not the URL) so it can't leak via
  // server/proxy logs, browser history, or Referer.
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ player: null, picks: {} });

  try {
    const wallet = await kv.get<string>(tokenKey(token));
    if (!wallet) return Response.json({ player: null, picks: {} });
    const [player, picks] = await Promise.all([
      kv.get<Player>(playerKey(wallet)),
      kv.get<Record<string, string>>(picksKey(wallet)),
    ]);
    return Response.json({ player: player ?? null, picks: picks ?? {} });
  } catch {
    return Response.json({ player: null, picks: {} });
  }
}
