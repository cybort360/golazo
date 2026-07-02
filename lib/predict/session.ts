import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { verifySession } from "@/lib/auth/session";

// Golazo identity resolution. Two cookies:
//   - glz_session — a SIGNED token for a real account (email + password). Cannot
//     be forged, so it's authoritative when present and valid.
//   - glz_uid     — a raw ghost id (PRD §6.3 guest play, low stakes). A ghost can
//     later create an account, carrying its pick history over.
// Accounts take precedence over any lingering ghost cookie.

const COOKIE = "glz_uid";
const SESSION_COOKIE = "glz_session";
const ONE_YEAR = 60 * 60 * 24 * 365;

/** The account user id from a valid signed session, if any. No ghost fallback. */
export async function accountUserId(): Promise<string | null> {
  return verifySession(cookies().get(SESSION_COOKIE)?.value);
}

/** The current user id: account session first, then ghost cookie. No creation. */
export async function currentUserId(): Promise<string | null> {
  const account = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (account) return account;
  return cookies().get(COOKIE)?.value ?? null;
}

/** Resolve the current user, creating a ghost (and setting the cookie) if needed. */
export async function ensureUser(): Promise<{ id: string; isGhost: boolean }> {
  // A valid account session wins — never mint a ghost for a signed-in account.
  const account = verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (account) {
    const u = await prisma.user.findUnique({ where: { id: account }, select: { id: true, isGhost: true } });
    if (u) return u;
    // Session references a deleted account — fall through to ghost minting.
  }

  const cookieId = cookies().get(COOKIE)?.value;

  // Normal path: middleware/guest-start already set glz_uid, so every tab shares
  // one id. Upsert keyed on it is idempotent — concurrent requests from the same
  // browser converge on a single ghost instead of racing to make one each.
  if (cookieId) {
    // Atomic, idempotent create keyed on the stable cookie id. ON CONFLICT DO
    // NOTHING means concurrent tabs from one browser converge on a single ghost
    // — no find-then-create race, no spurious unique-constraint errors. Existing
    // accounts (cookie = their user.id) already have a row, so this is a no-op.
    await prisma.$executeRaw`
      INSERT INTO "User" ("id", "handle", "isGhost", "anonId")
      VALUES (${cookieId}, ${"ghost_" + cookieId.slice(0, 8)}, true, ${cookieId})
      ON CONFLICT ("id") DO NOTHING
    `;
    const u = await prisma.user.findUnique({ where: { id: cookieId }, select: { id: true, isGhost: true } });
    if (u) return u;
  }

  // Fallback: no cookie (e.g. a direct API hit with no prior document load).
  // Create and set it here, as before.
  const anonId = randomUUID();
  const user = await prisma.user.create({
    data: { handle: `ghost_${anonId.slice(0, 8)}`, isGhost: true, anonId },
    select: { id: true, isGhost: true },
  });
  cookies().set(COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
    secure: process.env.NODE_ENV === "production",
  });
  return user;
}

/** Convert the current ghost to a named account, keeping its pick history. */
export async function convertUser(handle: string, displayName?: string) {
  const id = await currentUserId();
  if (!id) throw new Error("no current user");
  return prisma.user.update({
    where: { id },
    data: { handle, displayName, isGhost: false, convertedAt: new Date() },
  });
}
