import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { isAdminRequest } from "@/lib/adminAuth";
import { getCachedLeaderboards, currentWeekKeyEt } from "@/lib/predictionStore";
import { golazoBalance } from "@/lib/golazoBalance";
import { isPotEligible } from "@/lib/predictEligibility";
import type { LeaderRow } from "@/lib/predictions";

export const dynamic = "force-dynamic";

const TOP_N = 10;

interface PayoutRow extends LeaderRow {
  golazo: number | null;
  eligible: boolean;
}

// Admin-only: weekly + season leaders with FULL wallets, each annotated with
// their live $GOLAZO balance and whether they clear the hold-to-enter gate, so
// the bounty + token airdrop go to the top *eligible* predictor.
export async function GET() {
  if (!isAdminRequest()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const lb = await getCachedLeaderboards();
  const currentWeek = currentWeekKeyEt();
  const threshold = (await kv.get<number>("pred_min_golazo")) ?? 0;

  const weekTop = lb.weeks[currentWeek]?.slice(0, TOP_N) ?? [];
  const seasonTop = lb.season.slice(0, TOP_N);

  // One balance read per distinct wallet across both lists.
  const wallets = Array.from(
    new Set([...weekTop, ...seasonTop].map((r) => r.wallet)),
  );
  const balances = new Map<string, number | null>();
  await Promise.all(
    wallets.map(async (w) => balances.set(w, await golazoBalance(w))),
  );

  const annotate = (r: LeaderRow): PayoutRow => {
    const golazo = balances.get(r.wallet) ?? null;
    return { ...r, golazo, eligible: isPotEligible(golazo, threshold) };
  };

  return NextResponse.json({
    ok: true,
    currentWeek,
    threshold,
    weekTop: weekTop.map(annotate),
    seasonTop: seasonTop.map(annotate),
  });
}
