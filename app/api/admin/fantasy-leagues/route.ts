import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getAllLeagueCodes, getLeague } from "@/lib/fpl/store";
import { computeLeagueStandings } from "@/lib/fpl/leagueStandings";
import type { League } from "@/lib/fpl/types";

export const dynamic = "force-dynamic";

// Admin settlement view: every league with its standings, pot, rake, and the
// current leader (the suggested winner) + each member's payout wallet.
export async function GET() {
  if (!isAdminRequest()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const codes = await getAllLeagueCodes();
  const leagues = (await Promise.all(codes.map(getLeague))).filter(
    (l): l is League => l !== null,
  );

  const out = await Promise.all(
    leagues.map(async (l) => {
      const { rows, pot } = await computeLeagueStandings(l);
      const walletByPlayer = Object.fromEntries(l.members.map((m) => [m.playerId, m.wallet]));
      return {
        code: l.code,
        name: l.name,
        entryFee: l.entryFee,
        startGw: l.startGw,
        rakeBps: l.rakeBps,
        status: l.status,
        members: l.members.length,
        pot,
        winnerId: l.winnerId ?? null,
        payoutTxSig: l.payoutTxSig ?? null,
        standings: rows.map((r) => ({
          playerId: r.playerId,
          name: r.name,
          points: r.points,
          wallet: walletByPlayer[r.playerId] ?? null,
        })),
      };
    }),
  );

  // Newest first.
  out.sort((a, b) => b.code.localeCompare(a.code));
  return NextResponse.json({ ok: true, leagues: out });
}
