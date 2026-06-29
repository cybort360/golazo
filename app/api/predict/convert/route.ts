import { NextResponse } from "next/server";
import { convertUser } from "@/lib/predict/session";

// Convert the current ghost user into a named account, keeping pick history.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { handle, displayName } = (await req.json()) ?? {};
    if (!handle || typeof handle !== "string" || handle.length < 2) {
      return NextResponse.json({ ok: false, error: "invalid handle" }, { status: 400 });
    }
    const user = await convertUser(handle.trim(), displayName);
    return NextResponse.json({ ok: true, user: { id: user.id, handle: user.handle, isGhost: user.isGhost } });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    // Prisma unique-violation on handle
    if (msg.includes("Unique") || msg.includes("P2002")) {
      return NextResponse.json({ ok: false, error: "handle taken" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: msg.slice(0, 200) }, { status: 500 });
  }
}
