import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { isAdminRequest } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Only these keys may be written/cleared through the admin panel.
const PERMITTED_KEYS = new Set([
  "featured_match_id",
  "featured_announcement",
  "champion",
  "match_results",
  "token_addresses",
]);

export async function POST(request: Request) {
  if (!isAdminRequest()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: { key?: unknown; value?: unknown };
  try {
    body = (await request.json()) as { key?: unknown; value?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const { key, value } = body;
  if (typeof key !== "string" || key.length === 0) {
    return NextResponse.json({ ok: false, error: "key required" }, { status: 400 });
  }
  if (!PERMITTED_KEYS.has(key)) {
    return NextResponse.json(
      { ok: false, error: "key not allowed" },
      { status: 400 },
    );
  }

  try {
    // null/undefined value clears the key.
    if (value === null || value === undefined) {
      await kv.del(key);
    } else {
      await kv.set(key, value);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "KV error" }, { status: 500 });
  }
}
