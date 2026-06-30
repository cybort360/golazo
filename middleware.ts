import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Establish the ghost-identity cookie on the document request, BEFORE any client
// code fires /api/predict/* — so opening multiple tabs converges on a single
// guest instead of racing to mint one ghost per concurrent request. Ghost user
// creation (lib/predict/session) is then keyed idempotently on this cookie id.
const COOKIE = "glz_uid";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function middleware(request: NextRequest) {
  const res = NextResponse.next();
  if (!request.cookies.get(COOKIE)?.value) {
    res.cookies.set(COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: ONE_YEAR,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}

export const config = {
  // Run on page navigations only — skip static assets, images, and files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
