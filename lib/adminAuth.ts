import { cookies } from "next/headers";

export const ADMIN_COOKIE = "golazo_admin";

/**
 * Server-side guard for admin API routes. Returns true only when the request
 * carries a golazo_admin cookie matching ADMIN_SECRET. Never trust the client.
 */
export function isAdminRequest(): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const cookie = cookies().get(ADMIN_COOKIE)?.value;
  return cookie === secret;
}
