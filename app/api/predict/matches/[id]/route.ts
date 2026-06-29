import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { dbMatchToUi } from "@/lib/predict/map";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const row = await prisma.match.findUnique({ where: { id: params.id } });
    if (!row) return NextResponse.json({ ok: false, match: null }, { status: 404 });
    return NextResponse.json({ ok: true, match: dbMatchToUi(row) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, match: null, note: String(e?.message ?? e).slice(0, 120) }, { status: 500 });
  }
}
