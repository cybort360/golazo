import { NextResponse } from "next/server";
import { profileUi } from "@/lib/predict/profile-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Real public profile for the current user, derived from settled picks.
export async function GET() {
  const profile = await profileUi();
  if (!profile) return NextResponse.json({ ok: false, profile: null }, { status: 404 });
  return NextResponse.json({ ok: true, profile });
}
