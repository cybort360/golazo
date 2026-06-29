import { NextResponse } from "next/server";
import { profileByHandle } from "@/lib/predict/profile-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public profile by handle — shared /u/<handle> links resolve for anyone.
export async function GET(_req: Request, { params }: { params: { handle: string } }) {
  const profile = await profileByHandle(params.handle);
  if (!profile) return NextResponse.json({ ok: false, profile: null }, { status: 404 });
  return NextResponse.json({ ok: true, profile });
}
