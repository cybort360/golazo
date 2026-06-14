import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { isAdminRequest } from "@/lib/adminAuth";
import { computeOverallRows } from "@/lib/fpl/leaderboardServer";
import { getSeasonPot, getWeeklyPot } from "@/lib/fpl/store";
import { playerKey } from "@/lib/predictionStore";
import { activeGameweek, upcomingGameweek, gameweekById } from "@/lib/fpl/gameweeks";
import { golazoBalance } from "@/lib/golazoBalance";
import { isPotEligible } from "@/lib/predictEligibility";
import type { Player } from "@/lib/predictions";

export const dynamic = "force-dynamic";

const TOP_N = 10;

interface PayoutRow {
  playerId: string;
  name: string;
  points: number;
  wallet: string | null;
  golazo: number | null;
  eligible: boolean;
}

// Admin: the Holders League leaders — season + a chosen gameweek — each with
// their wallet, live $GOLAZO balance, and whether they clear the hold gate, so
// the $GOLAZO prizes go to the top *eligible* managers. Pay manually off-app.
export async function GET(request: Request) {
  if (!isAdminRequest()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const now = Date.now();
  const param = new URL(request.url).searchParams.get("gw");
  const gw = (param && gameweekById(param)) || activeGameweek(now) || upcomingGameweek(now);
  const gwId = gw?.id ?? null;

  const readThreshold = async () => {
    try {
      return (await kv.get<number>("pred_min_golazo")) ?? 0;
    } catch {
      return 0;
    }
  };
  const [rows, threshold, seasonPot, weeklyPot] = await Promise.all([
    computeOverallRows(now),
    readThreshold(),
    getSeasonPot(),
    gwId ? getWeeklyPot(gwId) : Promise.resolve(0),
  ]);

  const seasonTop = rows.slice(0, TOP_N);
  const weekTop = gwId
    ? [...rows]
        .sort((a, b) => (b.gwPoints[gwId] ?? 0) - (a.gwPoints[gwId] ?? 0))
        .slice(0, TOP_N)
    : [];

  // Resolve wallets for the players shown, then one balance read per wallet.
  const ids = Array.from(new Set([...seasonTop, ...weekTop].map((r) => r.playerId)));
  const walletById = new Map<string, string | null>();
  await Promise.all(
    ids.map(async (id) => {
      try {
        const p = await kv.get<Player>(playerKey(id));
        walletById.set(id, p?.wallet ?? null);
      } catch {
        walletById.set(id, null);
      }
    }),
  );
  const balances = new Map<string, number | null>();
  await Promise.all(
    Array.from(new Set(Array.from(walletById.values()).filter((w): w is string => !!w))).map(
      async (w) => balances.set(w, await golazoBalance(w)),
    ),
  );

  const annotate = (r: { playerId: string; name: string; points: number; gwPoints: Record<string, number> }, points: number): PayoutRow => {
    const wallet = walletById.get(r.playerId) ?? null;
    const golazo = wallet ? balances.get(wallet) ?? null : null;
    return { playerId: r.playerId, name: r.name, points, wallet, golazo, eligible: isPotEligible(golazo, threshold) };
  };

  return NextResponse.json({
    ok: true,
    gwId,
    gwLabel: gw?.label ?? null,
    threshold,
    seasonPot,
    weeklyPot,
    seasonTop: seasonTop.map((r) => annotate(r, r.points)),
    weekTop: weekTop.map((r) => annotate(r, gwId ? r.gwPoints[gwId] ?? 0 : 0)),
  });
}
