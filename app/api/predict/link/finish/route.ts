import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { validateWallet, type Player } from "@/lib/predictions";
import { linkMessage, SIGN_FRESHNESS_MS } from "@/lib/predictAuth";
import { verifyWalletSignature } from "@/lib/verifyWalletSignature";
import { playerKey, linkKey, walletLinkKey } from "@/lib/predictionStore";

export const dynamic = "force-dynamic";

// Finish linking a wallet to a Telegram account. The token proves which tg
// player asked (minted for them in /link/start); the signature proves wallet
// ownership. On success we set player.wallet, so the existing eligibility path
// gates the tg player identically to a web player.
export async function POST(request: Request) {
  let body: { token?: unknown; wallet?: unknown; signature?: unknown; ts?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  if (typeof body.token !== "string" || !body.token) {
    return NextResponse.json({ ok: false, error: "Missing link token" }, { status: 400 });
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
  if (
    !verifyWalletSignature(w.value, linkMessage(w.value, body.token, body.ts), body.signature)
  ) {
    return NextResponse.json(
      { ok: false, error: "Wallet signature did not verify" },
      { status: 401 },
    );
  }

  try {
    const id = await kv.get<string>(linkKey(body.token));
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "This link expired — start again from Telegram" },
        { status: 410 },
      );
    }

    const [player, walletOwner] = await Promise.all([
      kv.get<Player>(playerKey(id)),
      kv.get<string>(walletLinkKey(w.value)),
    ]);
    if (!player) {
      return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
    }
    // One wallet ↔ one account: reject if it's already this/another player's
    // web id, or already linked to a different tg account. (Idempotent if this
    // same account already owns it.)
    const takenByOther =
      (walletOwner && walletOwner !== id) ||
      (await kv.get<Player>(playerKey(w.value))) !== null;
    if (takenByOther) {
      return NextResponse.json(
        { ok: false, error: "That wallet is already linked to another Golazo account" },
        { status: 409 },
      );
    }

    await Promise.all([
      kv.set(playerKey(id), { ...player, id, wallet: w.value }),
      kv.set(walletLinkKey(w.value), id),
      kv.del(linkKey(body.token)), // single use
    ]);

    return NextResponse.json({ ok: true, nickname: player.nickname });
  } catch {
    return NextResponse.json({ ok: false, error: "KV error" }, { status: 500 });
  }
}
