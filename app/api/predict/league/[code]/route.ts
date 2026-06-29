import { NextResponse } from "next/server";
import { leagueStandings } from "@/lib/predict/league";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const view = await leagueStandings(params.code.toUpperCase());
  if (!view) return NextResponse.json({ ok: false, error: "league not found" }, { status: 404 });
  return NextResponse.json({ ok: true, league: view });
}
