import { NextResponse } from "next/server";
import { getUserReceipt } from "@/lib/predict/receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { pickId: string } }) {
  const receipt = await getUserReceipt(params.pickId);
  if (!receipt) return NextResponse.json({ ok: false, receipt: null }, { status: 404 });
  return NextResponse.json({ ok: true, receipt });
}
