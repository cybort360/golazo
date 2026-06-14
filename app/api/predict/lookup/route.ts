import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { validateWallet, type Player } from "@/lib/predictions";
import { playerKey } from "@/lib/predictionStore";

export const dynamic = "force-dynamic";

// Read-only: is this wallet already a registered player, and as whom? Lets the
// client show a "welcome back, sign in" path instead of a dead-end re-register
// when localStorage is empty (new device/browser/domain). The nickname is
// already public on the leaderboard, so nothing sensitive is exposed.
export async function GET(request: Request) {
  const wallet = new URL(request.url).searchParams.get("wallet") ?? "";
  const w = validateWallet(wallet);
  if (!w.ok) return NextResponse.json({ registered: false });

  try {
    // A web player's id is its wallet address.
    const player = await kv.get<Player>(playerKey(w.value));
    if (!player) return NextResponse.json({ registered: false });
    return NextResponse.json({ registered: true, nickname: player.nickname });
  } catch {
    return NextResponse.json({ registered: false });
  }
}
