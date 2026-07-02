import { NextResponse } from "next/server";
import { createLeague, myLeaguesUi, GuestForbiddenError } from "@/lib/predict/league";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { name } = (await req.json()) ?? {};
    const { code } = await createLeague(typeof name === "string" ? name : "My League");
    return NextResponse.json({ ok: true, code });
  } catch (e: any) {
    if (e instanceof GuestForbiddenError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: String(e?.message ?? e).slice(0, 200) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, leagues: await myLeaguesUi() });
}
