import { NextResponse } from "next/server";
import { getReceiptById } from "@/lib/predict/receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public by-id: a shared receipt link must render for anyone (P2-13).
export async function GET(_req: Request, { params }: { params: { pickId: string } }) {
  const receipt = await getReceiptById(params.pickId);
  if (!receipt) return NextResponse.json({ ok: false, receipt: null }, { status: 404 });
  return NextResponse.json({ ok: true, receipt });
}
