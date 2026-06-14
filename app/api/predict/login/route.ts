import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { kv } from "@vercel/kv";
import { validateWallet, type Player } from "@/lib/predictions";
import { loginMessage, SIGN_FRESHNESS_MS } from "@/lib/predictAuth";
import { verifyWalletSignature } from "@/lib/verifyWalletSignature";
import { playerKey, tokenKey } from "@/lib/predictionStore";

export const dynamic = "force-dynamic";

// Best-effort per-IP throttle (per instance). A login already requires a valid
// signature, so this is just belt-and-braces against token-minting spam.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;
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

// Re-authenticate an already-registered wallet and mint a fresh pick token.
// This is how a returning player gets back in on a new device, browser, or
// domain — no new account, points/picks untouched. Telegram players don't use
// this path (initData re-auths on every request).
export async function POST(request: Request) {
  if (rateLimited(clientIp(request))) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }

  let body: { wallet?: unknown; signature?: unknown; ts?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

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
  if (!verifyWalletSignature(w.value, loginMessage(w.value, body.ts), body.signature)) {
    return NextResponse.json(
      { ok: false, error: "Wallet signature did not verify" },
      { status: 401 },
    );
  }

  try {
    // A web player's id is its wallet address.
    const player = await kv.get<Player>(playerKey(w.value));
    if (!player) {
      return NextResponse.json(
        { ok: false, error: "This wallet isn't registered yet" },
        { status: 404 },
      );
    }

    const token = randomUUID();
    await kv.set(tokenKey(token), player.id);

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
