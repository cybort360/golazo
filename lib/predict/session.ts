import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/client";

// Ghost-mode identity (PRD §6.3): play with no signup. A ghost user is keyed by a
// cookie; it can later convert to a real account, keeping its pick history (same
// row, isGhost flipped). The first user action is a PICK, never a wallet connect.

const COOKIE = "glz_uid";
const ONE_YEAR = 60 * 60 * 24 * 365;

/** The current user id from the cookie, if any (no creation). */
export async function currentUserId(): Promise<string | null> {
  return cookies().get(COOKIE)?.value ?? null;
}

/** Resolve the current user, creating a ghost (and setting the cookie) if needed. */
export async function ensureUser(): Promise<{ id: string; isGhost: boolean }> {
  const existingId = cookies().get(COOKIE)?.value;
  if (existingId) {
    const u = await prisma.user.findUnique({ where: { id: existingId }, select: { id: true, isGhost: true } });
    if (u) return u;
  }
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
