import { NextResponse } from "next/server";
import { leagueUi } from "@/lib/predict/league";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const league = await leagueUi(params.code);
  if (!league) return NextResponse.json({ ok: false, error: "league not found" }, { status: 404 });
  return NextResponse.json({ ok: true, league });
}
