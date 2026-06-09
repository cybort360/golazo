import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Simple in-memory rate limit: max 10 *failed* attempts per IP per 15-minute
// window. Best-effort (per serverless instance) — enough to blunt brute force.
// Successful logins don't count and clear the counter.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const failures = new Map<string, { count: number; resetAt: number }>();

function isBlocked(ip: string): boolean {
  const entry = failures.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    failures.delete(ip);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function registerFailure(ip: string): void {
  const now = Date.now();
  const entry = failures.get(ip);
  if (!entry || now > entry.resetAt) {
    failures.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (isBlocked(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many failed attempts. Try again later." },
      { status: 429 },
    );
  }

  let password: unknown;
  try {
    ({ password } = (await request.json()) as { password?: unknown });
  } catch {
    password = undefined;
  }

  const secret = process.env.ADMIN_SECRET;
  if (!secret || typeof password !== "string" || password !== secret) {
    registerFailure(ip);
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Successful login — clear any failure record for this IP.
  failures.delete(ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, secret, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}
