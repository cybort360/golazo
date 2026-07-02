import { NextResponse } from "next/server";
import { clearGuestCookie, clearSessionCookie } from "@/lib/auth/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Log out: drop both the account session and any guest cookie, back to /welcome.
export async function POST() {
  clearSessionCookie();
  clearGuestCookie();
  return NextResponse.json({ ok: true, redirect: "/welcome" });
}
