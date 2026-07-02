import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { setGuestCookie, UID_COOKIE, clearSessionCookie } from "@/lib/auth/cookies";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Explicit "Play as guest" — mints a ghost user + sets glz_uid. This replaces the
// old middleware auto-minting: identity is now a deliberate choice on /welcome.
export async function POST() {
  const existing = cookies().get(UID_COOKIE)?.value;
  if (existing) {
    const u = await prisma.user.findUnique({ where: { id: existing }, select: { id: true } });
    if (u) return NextResponse.json({ ok: true, redirect: "/" });
  }
  const anonId = randomUUID();
  const user = await prisma.user.create({
    data: { handle: `ghost_${anonId.slice(0, 8)}`, isGhost: true, anonId },
    select: { id: true },
  });
  clearSessionCookie(); // starting fresh as a guest ends any stale account session
  setGuestCookie(user.id);
  return NextResponse.json({ ok: true, redirect: "/" });
}
