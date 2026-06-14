import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { setSeasonPot, setWeeklyPot } from "@/lib/fpl/store";
import { gameweekById } from "@/lib/fpl/gameweeks";

export const dynamic = "force-dynamic";

// Admin: set the Holders League prize pot — either the season pot or a specific
// gameweek's weekly pot (amount in $GOLAZO).
export async function POST(request: Request) {
  if (!isAdminRequest()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { scope?: unknown; gwId?: unknown; amount?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ ok: false, error: "Amount must be ≥ 0" }, { status: 400 });
  }

  try {
    if (body.scope === "season") {
      await setSeasonPot(amount);
    } else if (body.scope === "week") {
      if (typeof body.gwId !== "string" || !gameweekById(body.gwId)) {
        return NextResponse.json({ ok: false, error: "Valid gwId required" }, { status: 400 });
      }
      await setWeeklyPot(body.gwId, amount);
    } else {
      return NextResponse.json({ ok: false, error: "scope must be season or week" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "KV error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
