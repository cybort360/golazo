import { NextResponse } from "next/server";
import { getUserReceipts } from "@/lib/predict/receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? "10");
  const receipts = await getUserReceipts(Number.isFinite(limit) ? limit : 10);
  return NextResponse.json({ ok: true, receipts });
}
