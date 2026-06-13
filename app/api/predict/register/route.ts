import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { kv } from "@vercel/kv";
import { validateNickname, validateWallet, type Player } from "@/lib/predictions";
import { registerMessage, SIGN_FRESHNESS_MS } from "@/lib/predictAuth";
import { verifyWalletSignature } from "@/lib/verifyWalletSignature";
import { verifyInitData, telegramPlayerId } from "@/lib/telegramAuth";
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

  let body: {
    nickname?: unknown;
    wallet?: unknown;
    signature?: unknown;
    ts?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const nick = validateNickname(body.nickname);
  if (!nick.ok) return NextResponse.json({ ok: false, error: nick.error }, { status: 400 });

  // Two registration paths. Telegram Mini App: identity is proven by initData,
  // no wallet/signature, no token (every later request re-sends initData).
  // Web: a signed message proves the wallet, and we hand back a pick token.
  let id: string;
  let wallet: string | null;
  let token: string | null = null;

  const initData = request.headers.get("x-telegram-init-data");
  if (initData) {
    const user = verifyInitData(initData);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Telegram auth failed" },
        { status: 401 },
      );
    }
    id = telegramPlayerId(user.id);
    wallet = null;
  } else {
    const w = validateWallet(body.wallet);
    if (!w.ok) return NextResponse.json({ ok: false, error: w.error }, { status: 400 });
    if (typeof body.signature !== "string" || typeof body.ts !== "number") {
      return NextResponse.json(
        { ok: false, error: "Missing wallet signature" },
        { status: 400 },
      );
    }
    if (Math.abs(Date.now() - body.ts) > SIGN_FRESHNESS_MS) {
      return NextResponse.json(
        { ok: false, error: "Signature expired — try again" },
        { status: 400 },
      );
    }
    if (!verifyWalletSignature(w.value, registerMessage(w.value, body.ts), body.signature)) {
      return NextResponse.json(
        { ok: false, error: "Wallet signature did not verify" },
        { status: 401 },
      );
    }
    id = w.value;
    wallet = w.value;
    token = randomUUID();
  }

  try {
    // One registration per id, and nicknames are unique (case-insensitive).
    const [idTaken, nickTaken] = await Promise.all([
      kv.get<Player>(playerKey(id)),
      kv.get<string>(nickKey(nick.value)),
    ]);
    if (idTaken) {
      return NextResponse.json(
        { ok: false, error: "Already registered" },
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
      id,
      nickname: nick.value,
      wallet,
      createdAt: Date.now(),
    };

    const writes: Promise<unknown>[] = [
      kv.set(playerKey(id), player),
      kv.set(nickKey(nick.value), id),
    ];
    if (token) writes.push(kv.set(tokenKey(token), id));
    await Promise.all(writes);

    const ids = (await kv.get<string[]>(PLAYERS_KEY)) ?? [];
    if (!ids.includes(id)) await kv.set(PLAYERS_KEY, [...ids, id]);

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
