import { NextResponse } from "next/server";
import { settleFinished } from "@/lib/predict/settle";
import { isAdminAuthorized } from "@/lib/api/adminAuth";

// Run deterministic auto-settlement over all finished fixtures. Secret-protected
// (x-admin-secret header) for an external pinger. Idempotent. Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function run(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const counts = await settleFinished();
    return NextResponse.json({ ok: true, ...counts });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e).slice(0, 200) }, { status: 500 });
  }
}

export const POST = run;
export const GET = run;
