import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getLeague, saveLeague } from "@/lib/fpl/store";

export const dynamic = "force-dynamic";

// Admin: record a league's outcome after paying out off-app. `void` marks a
// league that didn't fill (members refunded manually); otherwise record the
// winner and the payout transaction.
export async function POST(request: Request) {
  if (!isAdminRequest()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { code?: unknown; winnerId?: unknown; payoutTxSig?: unknown; void?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  if (typeof body.code !== "string") {
    return NextResponse.json({ ok: false, error: "code required" }, { status: 400 });
  }

  const league = await getLeague(body.code);
  if (!league) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (body.void === true) {
    league.status = "void";
  } else {
    if (typeof body.winnerId !== "string" || typeof body.payoutTxSig !== "string") {
      return NextResponse.json(
        { ok: false, error: "winnerId and payoutTxSig required" },
        { status: 400 },
      );
    }
    if (!league.members.some((m) => m.playerId === body.winnerId)) {
      return NextResponse.json({ ok: false, error: "Winner isn't a member" }, { status: 400 });
    }
    league.status = "settled";
    league.winnerId = body.winnerId;
    league.payoutTxSig = body.payoutTxSig;
  }

  try {
    await saveLeague(league);
  } catch {
    return NextResponse.json({ ok: false, error: "KV error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
