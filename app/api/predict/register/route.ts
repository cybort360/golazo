import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { kv } from "@vercel/kv";
import { validateNickname, validateWallet, type Player } from "@/lib/predictions";
import {
  PLAYERS_KEY,
  playerKey,
  nickKey,
  tokenKey,
} from "@/lib/predictionStore";

export const dynamic = "force-dynamic";

// Best-effort per-IP throttle to blunt mass fake registrations (per instance).
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  if (rateLimited(clientIp(request))) {
    return NextResponse.json(
      { ok: false, error: "Too many registrations. Try again later." },
      { status: 429 },
    );
  }

  let body: { nickname?: unknown; wallet?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const nick = validateNickname(body.nickname);
  if (!nick.ok) return NextResponse.json({ ok: false, error: nick.error }, { status: 400 });
  const wallet = validateWallet(body.wallet);
  if (!wallet.ok)
    return NextResponse.json({ ok: false, error: wallet.error }, { status: 400 });

  try {
    // One registration per wallet, and nicknames are unique (case-insensitive).
    const [walletTaken, nickTaken] = await Promise.all([
      kv.get<Player>(playerKey(wallet.value)),
      kv.get<string>(nickKey(nick.value)),
    ]);
    if (walletTaken) {
      return NextResponse.json(
        { ok: false, error: "This wallet is already registered" },
        { status: 409 },
      );
    }
    if (nickTaken) {
      return NextResponse.json(
        { ok: false, error: "That nickname is taken" },
        { status: 409 },
      );
    }

    const player: Player = {
      nickname: nick.value,
      wallet: wallet.value,
      createdAt: Date.now(),
    };
    const token = randomUUID();

    await Promise.all([
      kv.set(playerKey(wallet.value), player),
      kv.set(nickKey(nick.value), wallet.value),
      kv.set(tokenKey(token), wallet.value),
    ]);
    const wallets = (await kv.get<string[]>(PLAYERS_KEY)) ?? [];
    if (!wallets.includes(wallet.value)) {
      await kv.set(PLAYERS_KEY, [...wallets, wallet.value]);
    }

    return NextResponse.json({
      ok: true,
      nickname: player.nickname,
      wallet: player.wallet,
      token,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "KV error" }, { status: 500 });
  }
}
