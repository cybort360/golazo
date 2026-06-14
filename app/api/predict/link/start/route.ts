import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { kv } from "@vercel/kv";
import { verifyInitData, telegramPlayerId } from "@/lib/telegramAuth";
import { playerKey, linkKey } from "@/lib/predictionStore";
import type { Player } from "@/lib/predictions";

export const dynamic = "force-dynamic";

const TOKEN_TTL_MS = 10 * 60 * 1000;

// Mint a short-lived, single-use token bound to the requesting Telegram player.
// The Mini App opens the web link flow with this token, which carries the
// Telegram identity to the browser without ever exposing initData in a URL.
export async function POST(request: Request) {
  const initData = request.headers.get("x-telegram-init-data");
  const user = initData ? verifyInitData(initData) : null;
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Telegram auth failed" },
      { status: 401 },
    );
  }

  const id = telegramPlayerId(user.id);

  try {
    const player = await kv.get<Player>(playerKey(id));
    if (!player) {
      return NextResponse.json(
        { ok: false, error: "Register in the Mini App first" },
        { status: 404 },
      );
    }
    if (player.wallet) {
      return NextResponse.json(
        { ok: false, error: "A wallet is already linked" },
        { status: 409 },
      );
    }

    const token = randomUUID();
    await kv.set(linkKey(token), id, { px: TOKEN_TTL_MS });
    return NextResponse.json({ ok: true, token });
  } catch {
    return NextResponse.json({ ok: false, error: "KV error" }, { status: 500 });
  }
}
