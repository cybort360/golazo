import { NextResponse } from "next/server";
import { syncAll } from "@/lib/predict/ingest";
import { settleFinished } from "@/lib/predict/settle";

// Serverless live-sync: pull TxLINE fixtures/events into Postgres and settle any
// finished matches. Replaces the persistent-server autosync interval (which can't
// run on serverless). Drive it from Vercel Cron (sends Authorization: Bearer
// <CRON_SECRET> automatically) or an external pinger (cron-job.org) for sub-
// minute freshness while matches are live.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // misconfigured → never an open trigger
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(req: Request): Promise<Response> {
  if (!authorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const synced = await syncAll();
    const settled = await settleFinished();
    return NextResponse.json({ ok: true, ...synced, settled });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String((e as Error)?.message ?? e).slice(0, 200) },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
