import { NextResponse } from "next/server";
import { getUserActivePicks } from "@/lib/predict/picks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The current user's active (PENDING) picks, grouped by match, for /picks.
export async function GET() {
  const groups = await getUserActivePicks();
  return NextResponse.json({ ok: true, groups });
}
