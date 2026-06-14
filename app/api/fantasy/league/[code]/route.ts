import { NextResponse } from "next/server";
import { getLeague } from "@/lib/fpl/store";
import { computeLeagueStandings } from "@/lib/fpl/leagueStandings";

export const dynamic = "force-dynamic";

// Public league view: details, pot breakdown, and current standings. Member
// wallets and payment signatures are never exposed.
export async function GET(
  _request: Request,
  { params }: { params: { code: string } },
) {
  const league = await getLeague(params.code);
  if (!league) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const { rows, pot } = await computeLeagueStandings(league);
  return NextResponse.json({
    ok: true,
    league: {
      code: league.code,
      name: league.name,
      entryFee: league.entryFee,
      startGw: league.startGw,
      rakeBps: league.rakeBps,
      status: league.status,
      memberCount: league.members.length,
      winnerId: league.winnerId ?? null,
      payoutTxSig: league.payoutTxSig ?? null,
    },
    pot,
    standings: rows.map((r) => ({ playerId: r.playerId, name: r.name, points: r.points })),
  });
}
