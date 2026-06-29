import { NextResponse } from "next/server";
import { syncAll } from "@/lib/predict/ingest";

// Trigger TxLINE ingestion (fixtures + append-only events) into Postgres. Secret-
// protected so an external pinger (GitHub Action / cron) can drive it without
// site traffic. Node runtime; never edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return true; // no secret configured (local dev) → allow
  const header = req.headers.get("x-admin-secret");
  const url = new URL(req.url);
  return header === secret || url.searchParams.get("secret") === secret;
}

async function run(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const counts = await syncAll();
    return NextResponse.json({ ok: true, ...counts });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e).slice(0, 200) }, { status: 500 });
  }
}

export const POST = run;
export const GET = run;
