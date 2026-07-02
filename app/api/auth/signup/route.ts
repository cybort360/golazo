import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { clearGuestCookie, clearSessionCookie, UID_COOKIE } from "@/lib/auth/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normEmail(e: unknown): string | null {
  if (typeof e !== "string") return null;
  const v = e.trim().toLowerCase();
  return EMAIL_RE.test(v) ? v : null;
}

function normHandle(h: unknown): string | null {
  if (typeof h !== "string") return null;
  const v = h.trim();
  if (v.length < 2 || v.length > 24) return null;
  if (!/^[a-zA-Z0-9_]+$/.test(v)) return null;
  if (v.startsWith("ghost_")) return null;
  return v;
}

// Create a real account. If the visitor is currently a guest, we attach the
// credentials to their existing row so their pick history carries over; then we
// clear BOTH cookies so they must log in fresh (per the product decision).
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const email = normEmail(body?.email);
  const handle = normHandle(body?.handle);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email) return NextResponse.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
  if (!handle)
    return NextResponse.json(
      { ok: false, error: "Handle must be 2–24 letters, numbers or underscores." },
      { status: 400 },
    );
  if (password.length < 8)
    return NextResponse.json({ ok: false, error: "Password must be at least 8 characters." }, { status: 400 });

  // Duplicate checks up front for friendly errors (P2002 still guards the race).
  const [emailTaken, handleTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findUnique({ where: { handle }, select: { id: true } }),
  ]);
  if (emailTaken) return NextResponse.json({ ok: false, error: "That email is already registered." }, { status: 409 });
  if (handleTaken) return NextResponse.json({ ok: false, error: "That handle is taken." }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const guestId = cookies().get(UID_COOKIE)?.value;
  const guest = guestId
    ? await prisma.user.findUnique({ where: { id: guestId }, select: { id: true, isGhost: true } })
    : null;

  try {
    if (guest && guest.isGhost) {
      // Carry over history: convert the guest row in place.
      await prisma.user.update({
        where: { id: guest.id },
        data: { email, passwordHash, handle, isGhost: false, convertedAt: new Date() },
      });
    } else {
      await prisma.user.create({ data: { email, passwordHash, handle, isGhost: false } });
    }
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ ok: false, error: "That email or handle is already taken." }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "Could not create account." }, { status: 500 });
  }

  // Force a fresh login: clear the ghost cookie and any stale session.
  clearGuestCookie();
  clearSessionCookie();
  return NextResponse.json({ ok: true, redirect: "/login" });
}
