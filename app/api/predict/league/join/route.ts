import { NextResponse } from "next/server";
import { joinLeague, GuestForbiddenError } from "@/lib/predict/league";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { code } = (await req.json()) ?? {};
    if (!code || typeof code !== "string") {
      return NextResponse.json({ ok: false, error: "missing code" }, { status: 400 });
    }
    const res = await joinLeague(code.trim().toUpperCase());
    return NextResponse.json({ ok: true, code: res.code });
  } catch (e: any) {
    if (e instanceof GuestForbiddenError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
    }
    const msg = String(e?.message ?? e);
    if (msg.includes("not found")) {
      return NextResponse.json({ ok: false, error: "league not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: msg.slice(0, 200) }, { status: 500 });
  }
}
