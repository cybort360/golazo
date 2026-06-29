import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { ensureUser } from "@/lib/predict/session";
import { publicName, publicInitials, profileSlug } from "@/lib/predict/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The current user's public identity (creating a ghost + cookie on first visit),
// so the nav/header show the REAL player — never a hardcoded persona.
export async function GET() {
  const { id, isGhost } = await ensureUser();
  const u = await prisma.user.findUnique({
    where: { id },
    select: { id: true, handle: true, displayName: true, anonId: true },
  });
  if (!u) return NextResponse.json({ ok: false }, { status: 500 });
  const name = publicName(u);
  return NextResponse.json({
    ok: true,
    me: {
      handle: u.handle,
      name,
      initials: publicInitials(name),
      profileHref: `/u/${profileSlug(u)}`,
      isGhost,
    },
  });
}
