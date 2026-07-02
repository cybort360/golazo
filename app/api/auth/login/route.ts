import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie, clearGuestCookie } from "@/lib/auth/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Log in to a real account. On success we set the signed glz_session cookie and
// clear any lingering guest cookie so the account identity is authoritative.
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Enter your email and password." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  // Uniform failure (don't reveal whether the email exists).
  const ok = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : false;
  if (!ok || !user) {
    return NextResponse.json({ ok: false, error: "Incorrect email or password." }, { status: 401 });
  }

  setSessionCookie(user.id);
  clearGuestCookie();
  return NextResponse.json({ ok: true, redirect: "/" });
}
