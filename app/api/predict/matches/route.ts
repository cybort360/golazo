import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { dbMatchToUi } from "@/lib/predict/map";

// List matches from the TxLINE-ingested DB, mapped to the UI Match shape.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.match.findMany({ orderBy: { kickoff: "asc" } });
    return NextResponse.json({ ok: true, matches: rows.map(dbMatchToUi) });
  } catch (e: any) {
    return NextResponse.json({ ok: true, matches: [], note: String(e?.message ?? e).slice(0, 120) });
  }
}
