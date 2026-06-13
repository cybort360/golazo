import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getCachedLeaderboards, currentWeekKeyEt } from "@/lib/predictionStore";

export const dynamic = "force-dynamic";

const TOP_N = 10;

// Admin-only: the weekly + season leaders with FULL wallets so the bounty can
// be paid to the registered address.
export async function GET() {
  if (!isAdminRequest()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const lb = await getCachedLeaderboards();
  const currentWeek = currentWeekKeyEt();
  return NextResponse.json({
    ok: true,
    currentWeek,
    weekTop: (lb.weeks[currentWeek] ?? []).slice(0, TOP_N),
    seasonTop: lb.season.slice(0, TOP_N),
  });
}
