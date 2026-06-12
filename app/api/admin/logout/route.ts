import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Ends the caller's own admin session by clearing the golazo_admin cookie.
// There's no server-side session store, so this only logs out this browser; to
// invalidate every session at once, rotate ADMIN_SECRET and redeploy.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0, // expire immediately
  });
  return res;
}
