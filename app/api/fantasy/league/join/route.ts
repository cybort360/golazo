import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import type { Player } from "@/lib/predictions";
import { playerKey, resolvePlayerId } from "@/lib/predictionStore";
import {
  getLeague,
  saveLeague,
  getTeam,
  indexPlayerLeague,
  isEntryTxUsed,
  markEntryTxUsed,
} from "@/lib/fpl/store";
import { gameweekById } from "@/lib/fpl/gameweeks";
import { verifyGolazoPayment } from "@/lib/golazoTransfer";

export const dynamic = "force-dynamic";

// Join a league by paying the $GOLAZO entry fee. The client passes the on-chain
// transfer signature; we verify it really paid the treasury before adding them.
export async function POST(request: Request) {
  const id = await resolvePlayerId(request).catch(() => null);
  if (!id) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });

  const treasury = process.env.NEXT_PUBLIC_GOLAZO_TREASURY_WALLET;
  if (!treasury) {
    return NextResponse.json({ ok: false, error: "Leagues aren't open yet" }, { status: 503 });
  }

  let body: { code?: unknown; txSig?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  if (typeof body.code !== "string" || typeof body.txSig !== "string" || !body.txSig) {
    return NextResponse.json({ ok: false, error: "Missing code or payment" }, { status: 400 });
  }
  const code = body.code.toUpperCase();
  const txSig = body.txSig;

  const league = await getLeague(code);
  if (!league) return NextResponse.json({ ok: false, error: "No league with that code" }, { status: 404 });
  if (league.status !== "open") {
    return NextResponse.json({ ok: false, error: "This league is closed" }, { status: 400 });
  }
  const startGw = gameweekById(league.startGw);
  if (startGw && startGw.deadlineMs <= Date.now()) {
    return NextResponse.json({ ok: false, error: "This league has locked" }, { status: 400 });
  }
  if (league.members.some((m) => m.playerId === id)) {
    return NextResponse.json({ ok: false, error: "You're already in this league" }, { status: 409 });
  }

  // Must have a fantasy team to compete, and a linked wallet that paid.
  const [team, player] = await Promise.all([getTeam(id), kv.get<Player>(playerKey(id))]);
  if (!team) {
    return NextResponse.json({ ok: false, error: "Create your fantasy team first" }, { status: 400 });
  }
  const wallet = player?.wallet ?? null;
  if (!wallet) {
    return NextResponse.json({ ok: false, error: "Link a wallet first" }, { status: 400 });
  }

  if (await isEntryTxUsed(txSig)) {
    return NextResponse.json({ ok: false, error: "That payment was already used" }, { status: 409 });
  }

  const check = await verifyGolazoPayment({
    signature: txSig,
    from: wallet,
    treasury,
    minAmount: league.entryFee,
  });
  if (!check.ok) {
    return NextResponse.json({ ok: false, error: check.error ?? "Payment didn't verify" }, { status: 402 });
  }

  league.members = [
    ...league.members,
    { playerId: id, wallet, txSig, paidAt: Date.now() },
  ];
  try {
    await markEntryTxUsed(txSig); // claim the signature before recording membership
    await saveLeague(league);
    await indexPlayerLeague(id, code);
  } catch {
    return NextResponse.json({ ok: false, error: "KV error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
