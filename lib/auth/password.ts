import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Self-contained password hashing (no external dependency) using Node's scrypt.
// Stored form is "salt:hash", both hex. Verification is constant-time. This
// backs real accounts (email + password) so a player can log in from any device.

const scrypt = promisify(scryptCb);
const KEYLEN = 64;
const SALT_BYTES = 16;

/** Hash a plaintext password into a storable "salt:hash" string. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derived = (await scrypt(password, salt, KEYLEN)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

/** Verify a plaintext password against a stored "salt:hash". Constant-time. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const derived = (await scrypt(password, salt, KEYLEN)) as Buffer;
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
