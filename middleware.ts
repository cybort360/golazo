import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Identity is now a deliberate choice (Play as guest | Create account | Log in)
// made on /welcome — middleware no longer silently mints a ghost. A request with
// neither an account session nor a guest cookie is sent to /welcome. Returning
// visitors (either cookie present) pass straight through; the matcher already
// excludes /welcome, /login, /signup, API routes and assets.
const UID_COOKIE = "glz_uid";
const SESSION_COOKIE = "glz_session";

export function middleware(request: NextRequest) {
  const hasIdentity =
    !!request.cookies.get(SESSION_COOKIE)?.value || !!request.cookies.get(UID_COOKIE)?.value;
  if (!hasIdentity) {
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Run on page navigations only — skip auth pages, API routes, and assets.
  matcher: ["/((?!welcome|login|signup|api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
