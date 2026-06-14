import { NextResponse } from "next/server";
import { resolvePlayerId } from "@/lib/predictionStore";
import { getPlayerLeagueCodes, getLeague } from "@/lib/fpl/store";
import type { League } from "@/lib/fpl/types";

export const dynamic = "force-dynamic";

// Summaries of the leagues the signed-in player belongs to.
export async function GET(request: Request) {
  const id = await resolvePlayerId(request).catch(() => null);
  if (!id) return NextResponse.json({ leagues: [] });

  const codes = await getPlayerLeagueCodes(id);
  const leagues = (await Promise.all(codes.map(getLeague))).filter(
    (l): l is League => l !== null,
  );

  return NextResponse.json({
    leagues: leagues.map((l) => ({
      code: l.code,
      name: l.name,
      entryFee: l.entryFee,
      startGw: l.startGw,
      status: l.status,
      memberCount: l.members.length,
    })),
  });
}
