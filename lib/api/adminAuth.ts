import { timingSafeEqual } from "node:crypto";

// Shared auth gate for admin/cron-triggered routes (TxLINE sync + settle).
// - Header only (`x-admin-secret`); never accept the secret in the URL/query,
//   which would leak it into logs, history and referrers.
// - Fail closed in production when no secret is configured; allow only in
//   local/dev where ADMIN_SECRET is intentionally unset.
// - Constant-time comparison to avoid timing oracles.

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function isAdminAuthorized(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length === 0) {
    // No secret configured: allow only outside production (local dev).
    return process.env.NODE_ENV !== "production";
  }
  const header = req.headers.get("x-admin-secret");
  return header != null && safeEqual(header, secret);
}
