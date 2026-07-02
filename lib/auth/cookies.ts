import "server-only";
import { cookies } from "next/headers";
import { signSession, SESSION_TTL } from "@/lib/auth/session";

// Centralised cookie plumbing for guest + account identity, so every auth route
// sets/clears the same names with the same options.

export const UID_COOKIE = "glz_uid";
export const SESSION_COOKIE = "glz_session";
const ONE_YEAR = 60 * 60 * 24 * 365;

function base() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  };
}

/** Set the signed account session cookie for a user id. */
export function setSessionCookie(userId: string) {
  cookies().set(SESSION_COOKIE, signSession(userId), { ...base(), maxAge: SESSION_TTL });
}

/** Set the raw ghost cookie for a user id. */
export function setGuestCookie(userId: string) {
  cookies().set(UID_COOKIE, userId, { ...base(), maxAge: ONE_YEAR });
}

/** Remove the ghost cookie (used when converting/logging in as an account). */
export function clearGuestCookie() {
  cookies().set(UID_COOKIE, "", { ...base(), maxAge: 0 });
}

/** Remove the account session cookie. */
export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", { ...base(), maxAge: 0 });
}
