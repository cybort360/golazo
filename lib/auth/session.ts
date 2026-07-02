import { createHmac, timingSafeEqual } from "node:crypto";

// Signed session tokens for real accounts. A token is "userId.expiry.sig" where
// sig = HMAC-SHA256(userId|expiry, SESSION_SECRET). Unlike the raw glz_uid ghost
// cookie (a bare user id, fine for low-stakes guests), an account cookie must be
// unforgeable — otherwise anyone could impersonate an account by setting its id.

const DEFAULT_TTL = 60 * 60 * 24 * 90; // 90 days

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short (need >= 16 chars)");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/** Sign a session token for a user id, valid for `ttlSeconds` from now. */
export function signSession(userId: string, ttlSeconds = DEFAULT_TTL): string {
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${userId}|${expiry}`;
  return `${userId}.${expiry}.${sign(payload)}`;
}

/** Verify a session token; returns the userId if valid & unexpired, else null. */
export function verifySession(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiryStr, sig] = parts;
  const expiry = Number(expiryStr);
  if (!userId || !Number.isFinite(expiry)) return null;
  if (expiry < Math.floor(Date.now() / 1000)) return null;
  const expected = sign(`${userId}|${expiry}`);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return userId;
}

export const SESSION_TTL = DEFAULT_TTL;
